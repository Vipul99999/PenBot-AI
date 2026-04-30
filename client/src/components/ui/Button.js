import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ className = '', loading = false, children, disabled, ...rest }) {
    return (_jsx("button", { ...rest, disabled: disabled || loading, className: `primary-button ${className}`, children: loading ? 'Please wait...' : children }));
}
