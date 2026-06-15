<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
    name: "SvgIcon",
    props: {
        prefix: {
            type: String,
            default: "icon",
        },
        color: {
            type: String,
            default: "currentColor",
        },
        name: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const symbolId = computed(() => `#${props.prefix}-${props.name}`);
        return { symbolId };
    },
});
</script>
<template>
    <svg aria-hidden="true">
        <use
            :href="symbolId"
            :color="color"
        />
    </svg>
</template>

<style scoped></style>
