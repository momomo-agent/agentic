# Progress — task-1775587579648: Implement environment variable substitution ($VAR)

## Changes Made

### src/index.ts
1. **Constructor** (line 44): Added built-in env vars `HOME=/`, `PWD=/`, `PATH=/usr/bin:/bin`
2. **getEnv()** (line 53): Added public getter method
3. **cd()** (line 565-573): Added `this.env.set('PWD', ...)` sync for both `~`/empty and normal path cases
4. **execPipeline()** (line 82-87): Added VAR=value assignment detection before existing pipeline logic
5. **execSingle()** (line 232-236): Added `export VAR=value` command

### test/env-vars.test.ts
New test file with 7 tests covering:
- Built-in $HOME, ${HOME}/src bracket syntax
- Undefined variable expansion to empty string
- $PWD sync after cd
- VAR=value assignment and retrieval
- Multiple variables
- Variable substitution in pipes

## Adjustments from Design
- Fixed test assertion for `${HOME}/src`: since HOME is `/`, output is `//src` not `/src`
- Added PWD sync for cd('~') case in addition to normal cd case
- Defined local `makeMockFs` since it's not exported from `index.test.ts`

## Verification
- All 7 new tests pass
- Full suite: 336 tests, 52 files, 0 failures
