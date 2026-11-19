(() => {
  const rememberPreferenceKey = "form-function-remember-session";
  const storage = {
    async getItem(key) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    async setItem(key, value) {
      const rememberSession = window.localStorage.getItem(rememberPreferenceKey) !== "false";
      const selectedStorage = rememberSession ? window.localStorage : window.sessionStorage;
      const otherStorage = rememberSession ? window.sessionStorage : window.localStorage;
      selectedStorage.setItem(key, value);
      otherStorage.removeItem(key);
    },
    async removeItem(key) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  };

  window.createFormFunctionClient = () => {
    const config = window.FORM_FUNCTION_CONFIG;
    if (!window.supabase || !config || !config.supabaseUrl || !config.supabaseAnonKey) return null;
    return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  };
})();
