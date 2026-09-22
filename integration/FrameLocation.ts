// Swapped in for src/shim/FrameLocation by NormalModuleReplacementPlugin in clientHost.webpack.js.
declare const _ICL_FRAME_DOMAIN_REPLACEMENT_: string;

export const Frame = {
    FRAME_DOMAIN: _ICL_FRAME_DOMAIN_REPLACEMENT_,
    FRAME_PATH: "/ironweb-frame",
} as const;
