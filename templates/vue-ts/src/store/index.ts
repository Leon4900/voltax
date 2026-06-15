import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { useUserStore } from "./user";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

export {
    useUserStore
}
export default pinia;