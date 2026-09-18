/*
 * Where the shim loads the crypto frame from. Read at bundle time only; to target another environment, replace this
 * module in your bundler (see integration/FrameLocation.ts and clientHost.webpack.js).
 */
export const Frame = {
    FRAME_DOMAIN: "https://api.ironcorelabs.com",
    FRAME_PATH: "/ironweb-frame",
} as const;
