// Where small state that must survive an app kill is kept (the active
// workout, the units): on the phone, expo-sqlite's key-value store. The web
// keeps it in the browser instead (kvStorage.web.ts).
export { default as kvStorage } from 'expo-sqlite/kv-store';
