import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PenLine } from 'lucide-react';
export function BrandLogo({ compact = false }) {
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-brand text-white shadow-sm", children: _jsx(PenLine, { size: 22, strokeWidth: 2.4 }) }), !compact && (_jsxs("div", { className: "leading-tight", children: [_jsx("p", { className: "text-lg font-black tracking-normal text-ink", children: "PenBot" }), _jsx("p", { className: "text-xs font-semibold uppercase tracking-normal text-cyan-700", children: "AI Notes" })] }))] }));
}
