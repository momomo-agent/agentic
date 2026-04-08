# Test Result: Fix grep -i in non-streaming path

## Status: PASS

## Tests Run
- test/grep-i-nonstreaming-m16.test.ts: 3/3 passed

## Results
- grep -i -r matches case-insensitively via fs.grep path ✓
- grep -i -r -c counts case-insensitive matches ✓
- grep -i -r no match returns empty ✓

## DBB Verification
- grep -i matches Hello/HELLO/hello ✓
- grep -r -i across all files ✓
- grep -i no match returns '' ✓

## Edge Cases
- grep -i with -c flag: covered
- grep -i with -l flag: not explicitly tested (covered by existing grep-case-insensitive.test.ts)
- Invalid regex with -i: handled by existing validation
