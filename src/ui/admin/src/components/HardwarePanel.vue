<template>
  <dl>
    <template v-for="(v, k) in hardware" :key="k">
      <dt>{{ k }}</dt><dd>{{ v }}</dd>
    </template>
  </dl>
</template>

<script setup>
defineProps({ hardware: { type: Object, default: () => ({}) } })
</script>
