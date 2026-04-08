# ls -a 隐藏文件支持

## Progress

- Without `-a`: filter out entries with names starting with `.`
- With `-a`: prepend `.` and `..` synthetic entries, show all files
- Handles `-la` and `-al` combined flags correctly
