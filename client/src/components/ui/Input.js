import { jsx as _jsx } from "react/jsx-runtime";
export function Input(props) {
    return _jsx("input", { ...props, className: `field ${props.className || ''}` });
}
