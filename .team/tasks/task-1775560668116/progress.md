# ls -a 真实隐藏文件

## Progress

### Implementation Complete

**Changes Made:**

1. **Modified src/index.ts (lines 125-133)**
   - Updated ls() method to check if fs already returns `.` and `..` entries
   - Only adds synthetic `.` and `..` if they don't exist in the fs response
   - Preserves all real dotfiles from fs when `-a` flag is used
   - Still filters dotfiles when `-a` is not used

2. **Added tests to src/index.test.ts**
   - Test: ls -a shows hidden files from fs (.hidden, .gitignore)
   - Test: ls without -a hides dotfiles
   - Test: ls -a always includes . and ..
   - Test: ls -a does not duplicate . and .. if fs returns them

**Implementation Details:**

The fix prevents duplicate `.` and `..` entries by:
1. Checking if fs.ls() already returned these entries
2. Only adding synthetic entries if they're missing
3. Preserving all other dotfiles from fs when `-a` is set

**Edge Cases Handled:**
- Real dotfiles like `.gitignore` appear in `ls -a` output
- Dotfiles are hidden in regular `ls` output
- No duplicate `.` or `..` entries even if fs returns them
- Synthetic `.` and `..` are added when fs doesn't provide them

**Status:** Implementation complete and ready for review.
