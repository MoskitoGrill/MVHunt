// Heuristic pre-publication scan. Never print matched secret values.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const git = args => execFileSync('git',args,{maxBuffer:128*1024*1024})
const patterns = [
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['service-account-json',/"type"\s*:\s*"service_account"/],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['google-oauth-token',/\bya29\.[A-Za-z0-9_-]{30,}/],
  ['google-api-key-review',/\bAIza[0-9A-Za-z_-]{35}\b/],
  ['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['slack-token',/\bxox[baprs]-[A-Za-z0-9-]{20,}/],
  ['jwt-review',/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/],
  ['credential-url',/https?:\/\/[^\s/:]+:[^\s/@]+@/],
]
const findings=[]
const workingBinaryIds=new Set(),historyBinaryIds=[]
let workingText=0,historyText=0,binary=0
function scan(buffer,label,history=false) {
  if(buffer.includes(0)){binary++;return}
  if(history)historyText++;else workingText++
  const source=buffer.toString('utf8')
  for(const [kind,pattern] of patterns) if(pattern.test(source)) findings.push({scope:label,kind})
}
const files=git(['ls-files','-z','--cached','--others','--exclude-standard']).toString('utf8').split('\0').filter(Boolean)
for(const file of files) {
  const contents=readFileSync(file)
  if(contents.includes(0))workingBinaryIds.add(execFileSync('git',['hash-object','--stdin'],{input:contents}).toString('utf8').trim())
  scan(contents,file)
}
// All locally present objects, including unreachable blobs: broader than branches only.
const objects=git(['cat-file','--batch-all-objects','--batch'])
let offset=0,blobs=0,commits=0
const identities=new Set(),externalEmails=new Set(),images=[]
while(offset<objects.length){
  const end=objects.indexOf(10,offset)
  const [oid,type,sizeText]=objects.subarray(offset,end).toString('utf8').split(' ')
  const size=Number(sizeText),body=objects.subarray(end+1,end+1+size)
  offset=end+size+2
  if(type==='blob'){
    blobs++;scan(body,`git-blob:${oid}`,true)
    if(body.includes(0))historyBinaryIds.push(oid)
    if(body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) images.push(oid)
  }
  if(type==='commit'){
    commits++
    for(const match of body.toString('utf8').matchAll(/^(?:author|committer) (.+) <([^>]+)>/gm)){
      identities.add(match[1]+' <'+match[2]+'>')
      if(!match[2].endsWith('@users.noreply.github.com')) externalEmails.add(match[2])
    }
  }
}
console.log(JSON.stringify({files:files.length,workingText,historyBlobs:blobs,historyText,commits,binaryObjectsAndFiles:binary,historyPngBlobs:images.length,historicalBinaryNotInWorkingTree:historyBinaryIds.filter(oid=>!workingBinaryIds.has(oid)),gitIdentities:identities.size,nonNoreplyEmailCount:externalEmails.size,findings,limitations:'Heuristic scan; review screenshots, synthetic coordinates and author metadata separately. Ignored files are not scanned or included in publication. No matched values printed.'},null,2))
if(findings.length)process.exitCode=1
