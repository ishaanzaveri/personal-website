"""Exercise the deploy state machine without Docker or registry access."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

FAKE_DOCKER = '''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
p = Path(os.environ['STATE'])
s = json.loads(p.read_text())
a = sys.argv[1:]
s['calls'].append(a)
result = ''
code = 0
if a[0] == 'compose':
    cmd = a[3]
    if cmd == 'config': result = 'registry/mock:latest'
    elif cmd == 'ps': result = 'container' if s['running'] else ''
    elif cmd == 'pull':
        code = s.get('pull_failure', 0)
        if not code: s['cached'] = 'new'
    elif cmd == 'up':
        s['attempts'] += 1
        code = 1 if s.get('fail_deploy') and s['cached'] == 'new' else 0
        s['running'] = s['cached']
        s['health'] = 'running/unhealthy' if code else 'running/healthy'
elif a[0] == 'inspect': result = s['running'] if a[2] == '{{.Image}}' else s['health']
elif a[:2] == ['image', 'inspect']: result = s['cached']
elif a[:2] == ['image', 'tag']:
    if a[3].endswith(':rollback'): s['rollback'] = a[2]
    else: s['cached'] = s['rollback']
p.write_text(json.dumps(s))
print(result)
sys.exit(code)
'''

class UpdateTests(unittest.TestCase):
    def run_case(self, running='old', cached='old', health='running/healthy', **extra):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copy(Path(__file__).with_name('update.sh'), root / 'update.sh')
            (root / 'docker').write_text(FAKE_DOCKER)
            # macOS lacks flock; the actual locking primitive is provided by Ubuntu.
            (root / 'flock').write_text('#!/bin/sh\nexit 0\n')
            for name in ('docker', 'flock'):
                (root / name).chmod(0o755)
            state = root / 'state.json'
            state.write_text(json.dumps(dict(running=running, cached=cached, health=health,
                                            attempts=0, calls=[], **extra)))
            env = dict(os.environ, PATH=f'{root}:{os.environ["PATH"]}', STATE=str(state))
            result = subprocess.run(['bash', str(root / 'update.sh')], env=env,
                                    capture_output=True, text=True)
            return result.returncode, json.loads(state.read_text()), result.stdout

    def test_healthy_current_is_noop(self):
        code, state, _ = self.run_case(running='new', cached='new')
        self.assertEqual((code, state['attempts']), (0, 0))

    def test_previously_pulled_image_is_still_deployed(self):
        code, state, _ = self.run_case(cached='new')
        self.assertEqual((code, state['running'], state['attempts']), (0, 'new', 1))
        self.assertEqual(state['rollback'], 'old')

    def test_missing_or_unhealthy_container_is_recreated(self):
        for running, health in [('', ''), ('new', 'running/unhealthy'), ('new', 'exited/healthy')]:
            with self.subTest(running=running, health=health):
                code, state, _ = self.run_case(running=running, cached='new', health=health)
                self.assertEqual((code, state['running'], state['attempts']), (0, 'new', 1))

    def test_failed_health_rolls_back_and_reports_failure(self):
        code, state, output = self.run_case(fail_deploy=True)
        self.assertEqual((code, state['running'], state['attempts']), (1, 'old', 2))
        self.assertIn('restored old', output)
        self.assertTrue(all('--wait' in a for a in state['calls'] if a[:4] == ['compose', '-f', 'docker-compose.yml', 'up']))

    def test_pull_failure_does_not_touch_running_container(self):
        code, state, _ = self.run_case(pull_failure=1)
        self.assertEqual((code, state['running'], state['attempts']), (1, 'old', 0))

    def test_first_deploy_failure_has_no_rollback(self):
        code, state, output = self.run_case(running='', health='', fail_deploy=True)
        self.assertEqual((code, state['attempts']), (1, 1))
        self.assertIn('no previously healthy', output)

if __name__ == '__main__':
    unittest.main()
