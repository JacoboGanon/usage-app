import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=readFileSync(new URL('./workflows/release.yml',import.meta.url),'utf8');
test('both macOS artifacts build through the Mini route without obsolete Intel runners',()=>{
 assert.match(source,/build:\n\s+needs: \[\s*test, prepare, ci-route\s*\]/);
 assert.match(source,/runs-on:.*outputs\.macos/);
 assert.doesNotMatch(source,/macos-13|matrix\.os/);
 assert.match(source,/arch: x64/);assert.match(source,/arch: arm64/);
 assert.match(source,/publish:\n\s+needs: \[\s*build, prepare, ci-route\s*\]/);
 assert.match(source,/needs\.test\.result == 'success'/);
});

test('release publishing uses a supported Node action runtime',()=>assert.doesNotMatch(source,/softprops\/action-gh-release@v1/));
