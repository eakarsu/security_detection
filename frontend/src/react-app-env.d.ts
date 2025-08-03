/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_URL?: string;
    readonly REACT_APP_PYTHON_API_URL?: string;
    readonly REACT_APP_FRONTEND_URL?: string;
    readonly REACT_APP_LOCAL_DEV_MODE?: string;
    readonly REACT_APP_ENV?: string;
  }
}
