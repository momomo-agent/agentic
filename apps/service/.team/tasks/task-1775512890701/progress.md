# 修复 App.vue 组件导入和状态轮询

## Progress

- Fixed imports: DeviceList, LogViewer, HardwarePanel
- Module-level timer with top-level onUnmounted cleanup
- fetchStatus uses ?? operator, silent catch
- Template: :devices, :hardware bindings, <LogViewer /> without props
