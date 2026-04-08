import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import SystemStatus from './components/SystemStatus.vue'
import DeviceList from './components/DeviceList.vue'
import ConfigPanel from './components/ConfigPanel.vue'

const router = createRouter({
  history: createWebHistory('/admin'),
  routes: [
    { path: '/', component: SystemStatus },
    { path: '/devices', component: DeviceList },
    { path: '/config', component: ConfigPanel },
  ]
})

createApp(App).use(router).mount('#app')
