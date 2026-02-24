import { i as ssr_context } from './_@astro-renderers_DtO3kaqa.mjs';
import 'clsx';

/** @import { SSRContext } from '#server' */
/** @import { Renderer } from './internal/server/renderer.js' */

/** @param {() => void} fn */
function onDestroy(fn) {
	/** @type {Renderer} */ (/** @type {SSRContext} */ (ssr_context).r).on_destroy(fn);
}

export { onDestroy as o };
