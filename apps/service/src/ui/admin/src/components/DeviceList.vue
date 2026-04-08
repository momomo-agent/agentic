<template>
  <div>
    <div v-if="!devices.length">No devices registered</div>
    <table v-else>
      <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th></tr></thead>
      <tbody>
        <tr v-for="d in devices" :key="d.id">
          <td>{{ d.id }}</td><td>{{ d.name }}</td><td>{{ d.type }}</td><td>{{ d.status }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const devices = ref([])
const error = ref(null)
onMounted(async () => {
  try { devices.value = await fetch('/api/devices').then(r => r.json()) }
  catch (e) { error.value = e.message }
})
</script>
