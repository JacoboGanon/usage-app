import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source=readFileSync(new URL('./workflows/release.yml',import.meta.url),'utf8');

function jobEnabled(name, {event, artifactsOnly, prepare = 'success', build = 'success', validation = 'success'}) {
 const job=source.split(`\n  ${name}:\n`)[1]?.split(/\n  \S/)[0];
 const line=job?.match(/^    if: (.+)$/m)?.[1];
 assert.ok(line, `Missing condition for ${name}`);
 const expression=line.replace(/^"|"$/g,'').replace(/^\$\{\{\s*|\s*\}\}$/g,'');
 return new Function('needs','github','inputs','always','cancelled',`return (${expression})`)(
  {'ci-route':{result:'success'},prepare:{result:prepare},build:{result:build},test:{result:validation}},
  {event_name:event}, {artifacts_only:artifactsOnly}, ()=>true, ()=>false,
 );
}

test('artifact-only runs never prepare a version or create a draft release',()=>{
 assert.match(source,/artifacts_only:\n\s+description:.*\n\s+type: boolean\n\s+default: false/);
 const run={event:'workflow_dispatch',artifactsOnly:true,prepare:'skipped'};
 assert.equal(jobEnabled('prepare',run),false);
 assert.equal(jobEnabled('publish',run),false);
 assert.equal(jobEnabled('test',run),true);
 assert.equal(jobEnabled('build',run),true);
 assert.equal(jobEnabled('build',{...run,validation:'failure'}),false);
});

test('explicit releases retain their prepare and publish paths and require a successful build',()=>{
 const manual={event:'workflow_dispatch',artifactsOnly:false};
 assert.equal(jobEnabled('prepare',manual),true);
 assert.equal(jobEnabled('publish',manual),true);
 assert.equal(jobEnabled('publish',{...manual,build:'failure'}),false);
 const tag={event:'push',artifactsOnly:undefined,prepare:'skipped'};
 assert.equal(jobEnabled('prepare',tag),false);
 assert.equal(jobEnabled('publish',tag),true);
});
test('both macOS artifacts build through the Mini route without obsolete Intel runners',()=>{
 assert.match(source,/build:\n\s+needs: \[\s*test, prepare, ci-route\s*\]/);
 assert.match(source,/runs-on:.*outputs\.macos/);
 assert.doesNotMatch(source,/macos-13|matrix\.os/);
 assert.match(source,/arch: x64/);assert.match(source,/arch: arm64/);
 assert.match(source,/publish:\n\s+needs: \[\s*build, prepare, ci-route\s*\]/);
 assert.match(source,/needs\.test\.result == 'success'/);
});

test('release publishing uses a supported Node action runtime',()=>assert.doesNotMatch(source,/softprops\/action-gh-release@v1/));

test('signing uses protected API credentials and a memory budget suitable for the Mini',()=>{
 const build=source.slice(source.indexOf('\n  build:'),source.indexOf('\n  publish:'));
 assert.match(build,/environment: mac-build/);
 assert.match(build,/NODE_OPTIONS:.*max-old-space-size=4096/);
 assert.match(build,/CSC_LINK:.*secrets.MAC_CSC_LINK/);
 assert.match(build,/APPLE_API_KEY_ID:.*secrets.APPLE_API_KEY_ID/);
 assert.match(build,/forceCodeSigning=true/);
 assert.match(build,/mac.notarize=true/);
 assert.match(build,/--mac.*--publish never/);
 assert.doesNotMatch(build,/APPLE_APP_SPECIFIC_PASSWORD|matrix.script/);
 assert.match(build,/name: Remove notarization key\n\s+if: always\(\)/);
});
