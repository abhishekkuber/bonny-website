// Character art for "him" and "her" (bonny). Single source of truth: every
// page builds its characters from here, so a hair tweak updates the whole site.
//
// Both full-body SVGs use a 140 x 362 viewBox at the same scale, so they stand
// on the same ground line. Parts are separate groups for rigging:
//   .leg-l .leg-r .arm-l .arm-r  limbs (pivot set via transform-origin)
//   .feat                        eyes/brows/mouth/blush; shifted to "look" around
//   .eyes-* / .mouth-*           expressions, switched by data-eyes / data-mouth
//   .acc-*                       accessories (sunglasses, scarf, sweat), shown by an acc-* class on the svg
// Styling lives in assets/css/characters.css.

const HEART = 'M0 10 C-16 -2 -10 -18 0 -8 C10 -18 16 -2 0 10Z';

export const VIEWBOX = { w: 140, h: 362 };

/* ------------------------------------------------------------------ him */

const HIM_HEAD = `
  <g class="head">
    <circle class="skin line" cx="71" cy="126" r="11"/>
    <circle class="skin line" cx="189" cy="126" r="11"/>
    <ellipse class="skin line" cx="130" cy="118" rx="60" ry="56"/>
    <ellipse class="flush" cx="130" cy="118" rx="60" ry="56"/>
    <path class="hair line" d="M70 114 C66 90 76 66 96 58 C104 50 116 48 126 52
             C136 46 150 46 160 52 C176 56 190 72 192 94 C193 104 192 110 190 116
             C184 104 176 96 166 94 C158 104 146 106 138 98
             C130 108 116 110 108 100 C100 108 88 108 82 100
             C78 106 74 110 70 114 Z"/>
    <path class="hair-shine" d="M98 70 q9 -6 18 0 q9 6 18 0 M144 64 q8 -6 16 0"/>
    <g class="feat">
      <path class="brows" d="M99 110 q8 -4 16 0 M145 110 q8 -4 16 0"/>
      <g class="eyes eyes-normal">
        <g class="eye"><ellipse class="ink" cx="107" cy="126" rx="7" ry="9"/><circle cx="110" cy="122" r="2.6" fill="#fff"/></g>
        <g class="eye"><ellipse class="ink" cx="153" cy="126" rx="7" ry="9"/><circle cx="156" cy="122" r="2.6" fill="#fff"/></g>
      </g>
      <g class="eyes eyes-surprised">
        <circle class="ink" cx="107" cy="126" r="9.5"/><circle cx="111" cy="121" r="3.2" fill="#fff"/>
        <circle class="ink" cx="153" cy="126" r="9.5"/><circle cx="157" cy="121" r="3.2" fill="#fff"/>
      </g>
      <g class="eyes eyes-happy stroke"><path d="M99 129 Q107 118 115 129"/><path d="M145 129 Q153 118 161 129"/></g>
      <g class="eyes eyes-closed stroke"><path d="M99 124 Q107 132 115 124"/><path d="M145 124 Q153 132 161 124"/></g>
      <g class="eyes eyes-hearts">
        <g transform="translate(107 126) scale(.85)"><path class="heart-eye" d="${HEART}"/></g>
        <g transform="translate(153 126) scale(.85)"><path class="heart-eye" d="${HEART}"/></g>
      </g>
      <g class="blush"><ellipse cx="94" cy="144" rx="11" ry="6"/><ellipse cx="166" cy="144" rx="11" ry="6"/></g>
      <path class="blush-lines" d="M86 143 l4 -6 M92 144 l4 -6 M98 145 l4 -6 M160 145 l4 -6 M166 144 l4 -6 M172 143 l4 -6"/>
      <path class="hair" d="M116 147 Q123 139 130 144 Q137 139 144 147 Q137 150 130 147.5 Q123 150 116 147 Z"/>
      <path class="mouth mouth-smile stroke" d="M124 155 Q130 160 136 155"/>
      <path class="mouth mouth-grin mouth-fill" d="M122 153 Q130 167 138 153 Z"/>
      <ellipse class="mouth mouth-o mouth-fill" cx="130" cy="157" rx="4" ry="5"/>
      <ellipse class="mouth mouth-kiss mouth-fill" cx="130" cy="156" rx="3.5" ry="3"/>
      <g class="mouth mouth-teeth"><rect class="teeth" x="122" y="151" width="16" height="8" rx="2"/><path class="teeth-lines" d="M126 151 V159 M130 151 V159 M134 151 V159"/></g>
      <g class="acc acc-sunglasses">
        <rect class="shades" x="92" y="116" width="30" height="20" rx="9"/><rect class="shades" x="138" y="116" width="30" height="20" rx="9"/>
        <path class="shades-line" d="M122 121 Q130 117 138 121 M92 121 L74 118 M168 121 L186 118"/>
        <path class="shine" d="M98 121 l7 0 M144 121 l7 0"/>
      </g>
    </g>
    <path class="acc acc-sweat sweat" d="M176 84 q6 9 0 13 q-6 -4 0 -13z"/>
  </g>`;

const HIM_NECK = `<rect class="skin" x="123" y="166" width="14" height="20"/>`;

const HIM_BODY = `
  <g class="limb leg-l" style="transform-origin:119px 318px">
    <rect class="skin line" x="114" y="318" width="11" height="62" rx="5"/>
    <rect class="shoe line" x="111" y="370" width="16" height="20" rx="4"/>
    <ellipse class="shoe line" cx="114" cy="390" rx="15" ry="7"/>
    <rect class="sole line" x="98" y="393" width="31" height="6" rx="3"/>
    <ellipse cx="104" cy="390" rx="5.5" ry="4.5" fill="#fff"/>
  </g>
  <g class="limb leg-r" style="transform-origin:141px 318px">
    <rect class="skin line" x="135" y="318" width="11" height="62" rx="5"/>
    <rect class="shoe line" x="133" y="370" width="16" height="20" rx="4"/>
    <ellipse class="shoe line" cx="146" cy="390" rx="15" ry="7"/>
    <rect class="sole line" x="131" y="393" width="31" height="6" rx="3"/>
    <ellipse cx="156" cy="390" rx="5.5" ry="4.5" fill="#fff"/>
  </g>
  <path class="line" fill="#7b9cc6" d="M104 278 H156 L160 330 H133 L130 300 L127 330 H100 Z"/>
  <path d="M102 326 H126 M134 326 H158" stroke="#a9c1e0" stroke-width="3"/>
  <g class="limb arm-l" style="transform-origin:86px 230px">
    <path class="arm-outline" d="M86 230 L92 290"/><path class="arm-skin" d="M86 230 L92 290"/>
  </g>
  <g class="limb arm-r" style="transform-origin:174px 230px">
    <path class="arm-outline" d="M174 230 L168 290"/><path class="arm-skin" d="M174 230 L168 290"/>
  </g>
  <path class="line" fill="#2a2a2e" d="M100 184 Q130 178 160 184 L188 222 L170 238 L162 228 L165 288 H95 L98 228 L90 238 L72 222 Z"/>
  <path d="M120 184 Q130 192 140 184" fill="none" stroke="#4a4a50" stroke-width="3"/>
  ${HIM_NECK}
  <g class="acc acc-scarf">
    <path class="scarf line" d="M104 176 Q130 188 156 176 L158 190 Q130 203 102 190 Z"/>
    <path class="scarf line" d="M138 191 L147 226 L135 229 L128 195 Z"/>
    <path class="scarf-stripe" d="M112 183 L110 193 M148 183 L150 193 M136 210 L146 208"/>
  </g>
  ${HIM_HEAD}`;

/* ------------------------------------------------------------------ her */

const HER_BODY = `
  <g transform="translate(0 -20)">
    <path class="hair line" d="M214 214 C206 150 236 144 270 144 C304 144 334 150 326 214 L330 276 C318 288 300 286 294 278 H246 C240 286 222 288 210 276 Z"/>
  </g>
  <g class="limb leg-l" style="transform-origin:257px 300px">
    <path class="jeans line" d="M244 300 H270 L267 384 H243 Z"/>
    <ellipse class="shoe line" cx="253" cy="390" rx="14" ry="8"/><ellipse cx="248" cy="387" rx="4" ry="2" fill="#555"/>
  </g>
  <g class="limb leg-r" style="transform-origin:283px 300px">
    <path class="jeans line" d="M270 300 H296 L297 384 H273 Z"/>
    <ellipse class="shoe line" cx="287" cy="390" rx="14" ry="8"/><ellipse cx="292" cy="387" rx="4" ry="2" fill="#555"/>
  </g>
  <g transform="translate(0 -20)">
    <g class="limb arm-l" style="transform-origin:228px 302px">
      <path class="sleeve-outline" d="M228 302 L234 336"/><path class="sleeve" d="M228 302 L234 336"/>
      <circle class="skin line" cx="235" cy="343" r="7"/>
    </g>
    <g class="limb arm-r" style="transform-origin:312px 302px">
      <path class="sleeve-outline" d="M312 302 L306 336"/><path class="sleeve" d="M312 302 L306 336"/>
      <circle class="skin line" cx="305" cy="343" r="7"/>
    </g>
    <path class="line" fill="#fffaf5" d="M242 272 Q270 266 298 272 L318 300 L306 312 L299 304 L301 326 H239 L241 304 L234 312 L222 300 Z"/>
    <path d="M270 280 V326" stroke="#e8d8cc" stroke-width="2"/>
    <circle cx="274" cy="292" r="2" fill="#d9b8a8"/><circle cx="274" cy="304" r="2" fill="#d9b8a8"/><circle cx="274" cy="316" r="2" fill="#d9b8a8"/>
    <path class="line" fill="#fffaf5" d="M256 270 L270 283 L260 290 Z M284 270 L270 283 L280 290 Z"/>
    <g class="head">
      <rect class="skin" x="263" y="256" width="14" height="18"/>
      <g class="acc acc-scarf">
        <path class="scarf line" d="M244 262 Q270 276 296 262 L298 276 Q270 290 242 276 Z"/>
        <path class="scarf line" d="M278 277 L287 305 L275 308 L268 281 Z"/>
        <path class="scarf-stripe" d="M252 268 L250 278 M288 268 L290 278 M276 292 L285 290"/>
      </g>
      <ellipse class="skin line" cx="270" cy="212" rx="58" ry="54"/>
      <ellipse class="flush" cx="270" cy="212" rx="58" ry="54"/>
      <path class="hair line" d="M214 206 C210 240 212 266 222 284 C232 276 232 250 228 222 Z"/>
      <path class="hair line" d="M326 206 C330 240 328 266 318 284 C308 276 308 250 312 222 Z"/>
      <path class="hair line" d="M213 214 C208 168 236 150 270 150 C304 150 332 168 327 214
               C322 200 318 192 312 188 C302 200 290 198 284 186
               C276 198 264 198 256 186 C248 198 236 198 228 188
               C222 192 217 202 213 214 Z"/>
      <g class="feat">
        <g class="eyes eyes-normal">
          <g class="eye"><ellipse class="ink" cx="250" cy="224" rx="6.5" ry="8.5"/><circle cx="252.5" cy="220.5" r="2.4" fill="#fff"/></g>
          <g class="eye"><ellipse class="ink" cx="290" cy="224" rx="6.5" ry="8.5"/><circle cx="292.5" cy="220.5" r="2.4" fill="#fff"/></g>
        </g>
        <g class="eyes eyes-surprised">
          <circle class="ink" cx="250" cy="224" r="8.5"/><circle cx="253.5" cy="219.5" r="3" fill="#fff"/>
          <circle class="ink" cx="290" cy="224" r="8.5"/><circle cx="293.5" cy="219.5" r="3" fill="#fff"/>
        </g>
        <g class="eyes eyes-happy stroke"><path d="M243 227 Q250 217 257 227"/><path d="M283 227 Q290 217 297 227"/></g>
        <g class="eyes eyes-closed stroke"><path d="M243 222 Q250 230 257 222"/><path d="M283 222 Q290 230 297 222"/></g>
        <g class="eyes eyes-hearts">
          <g transform="translate(250 224) scale(.72)"><path class="heart-eye" d="${HEART}"/></g>
          <g transform="translate(290 224) scale(.72)"><path class="heart-eye" d="${HEART}"/></g>
        </g>
        <g class="glasses">
          <circle cx="250" cy="224" r="15"/><circle cx="290" cy="224" r="15"/>
          <path d="M265 222 Q270 217 275 222 M235 221 L224 218 M305 221 L316 218" fill="none"/>
        </g>
        <g class="blush"><ellipse cx="238" cy="246" rx="11" ry="6"/><ellipse cx="302" cy="246" rx="11" ry="6"/></g>
        <path class="blush-lines" d="M230 245 l4 -6 M236 246 l4 -6 M242 247 l4 -6 M298 247 l4 -6 M304 246 l4 -6 M310 245 l4 -6"/>
        <path class="mouth mouth-smile stroke" d="M264 248 Q270 253 276 248"/>
        <path class="mouth mouth-grin mouth-fill" d="M263 246 Q270 259 277 246 Z"/>
        <ellipse class="mouth mouth-o mouth-fill" cx="270" cy="250" rx="4" ry="5"/>
        <ellipse class="mouth mouth-kiss mouth-fill" cx="270" cy="249" rx="3.5" ry="3"/>
        <g class="mouth mouth-teeth"><rect class="teeth" x="262" y="245" width="16" height="8" rx="2"/><path class="teeth-lines" d="M266 245 V253 M270 245 V253 M274 245 V253"/></g>
        <circle class="mole" cx="262" cy="256" r="1.9"/>
        <g class="acc acc-sunglasses">
          <circle class="shades" cx="250" cy="224" r="15"/><circle class="shades" cx="290" cy="224" r="15"/>
          <path class="shades-line" d="M265 222 Q270 217 275 222 M235 221 L224 218 M305 221 L316 218"/>
          <path class="shine" d="M242 218 l6 -3 M282 218 l6 -3"/>
        </g>
      </g>
      <path class="acc acc-sweat sweat" d="M318 176 q6 9 0 13 q-6 -4 0 -13z"/>
    </g>
  </g>`;

/* ------------------------------------------------------------------ api */

const BODIES = {
  him: { minX: 60, markup: HIM_BODY },
  her: { minX: 200, markup: HER_BODY },
};

/** Full-body character. who: 'him' | 'her'. */
export function characterSVG(who, { id = '', cls = '', attrs = '' } = {}) {
  const b = BODIES[who];
  return `<svg ${id ? `id="${id}"` : ''} ${attrs} class="chr chr-${who} ${cls}" viewBox="${b.minX} 40 ${VIEWBOX.w} ${VIEWBOX.h}"
    data-eyes="normal" data-mouth="smile" aria-hidden="true">${b.markup}</svg>`;
}

/** Just his head, big, for the kiss gate. Wrapped in .kissable. */
export function himHeadSVG({ id = '', cls = '' } = {}) {
  return `<svg ${id ? `id="${id}"` : ''} class="chr chr-him ${cls}" viewBox="50 34 160 160"
    data-eyes="normal" data-mouth="smile" role="img" aria-label="his face, waiting for kisses">
    <g class="kissable">${HIM_HEAD}</g></svg>`;
}
