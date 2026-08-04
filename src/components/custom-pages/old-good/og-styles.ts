// The Old Good stylesheet, carried over from the reference build
// (Jordan/thrift-shop-demo.html) with the class prefix renamed and the
// Google-CDN fonts replaced by next/font variables. Served inline by the
// server component the same way the reference served its own <style>.
export const OG_CSS = `
.og {
  --indigo:#1A222D; --indigo2:#232E3B; --calico:#E3DAC5; --chalk:#F6F3EB;
  --fluoro:#FF4A0F; --wash:#7C93A8; --card:#DFD4BC; --line:rgba(246,243,235,.16);
  --disp: var(--og-disp), 'Arial Narrow', sans-serif;
  --mono: var(--og-mono), ui-monospace, Menlo, monospace;
  --body: var(--og-body), system-ui, -apple-system, sans-serif;
  background: var(--indigo); color: var(--chalk); font-family: var(--body);
  font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased;
  position: relative; overflow-x: hidden; min-height: 100vh;
}
.og *, .og *::before, .og *::after { box-sizing: border-box; }
.og p, .og h1, .og h2, .og h3, .og ul, .og figure, .og dl, .og dd { margin: 0; padding: 0; }
.og button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.og :focus-visible { outline: 2px solid var(--fluoro); outline-offset: 3px; }
.og-wrap { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
.og-strip { background: var(--fluoro); color: #14100C; font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; padding: 7px 0; overflow: hidden; white-space: nowrap; }
.og-strip-track { display: inline-block; animation: og-slide 34s linear infinite; }
.og-strip-track span { padding: 0 22px; }
@keyframes og-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.og-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 22px 0 18px; flex-wrap: wrap; }
.og-logo { font-family: var(--disp); font-weight: 900; font-size: clamp(26px,4vw,40px); letter-spacing: .01em; text-transform: uppercase; line-height: .9; border-bottom: 2px dashed transparent; padding-bottom: 2px; min-width: 4ch; }
.og-logo:hover, .og-logo:focus { border-bottom-color: var(--fluoro); }
.og-logo-hint { font-family: var(--mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--fluoro); display: block; margin-bottom: 5px; }
.og-nav { display: flex; align-items: center; gap: 8px; }
.og-nav a { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--wash); text-decoration: none; padding: 6px 8px; }
.og-nav a:hover { color: var(--chalk); }
.og-bagbtn { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; border: 1px solid var(--chalk); padding: 8px 14px; border-radius: 999px; }
.og-bagbtn[data-full="1"] { background: var(--fluoro); border-color: var(--fluoro); color: #14100C; }
.og-hero { padding: 26px 0 8px; }
.og-hero h1 { font-family: var(--disp); font-weight: 900; text-transform: uppercase; font-size: clamp(64px,17vw,210px); line-height: .78; letter-spacing: -.015em; }
.og-hero h1 em { font-style: normal; color: var(--fluoro); }
.og-hero-sub { display: flex; gap: 26px; flex-wrap: wrap; align-items: flex-start; border-top: 1px solid var(--line); margin-top: 18px; padding-top: 14px; }
.og-hero-sub > p { max-width: 34ch; color: #C6CFD8; }
.og-facts { display: flex; gap: 22px; flex-wrap: wrap; margin-left: auto; }
.og-fact { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--wash); }
.og-fact b { display: block; font-family: var(--disp); font-weight: 700; font-size: 30px; color: var(--chalk); letter-spacing: 0; }
.og-railwrap { margin: 30px 0 0; position: relative; }
.og-railbar { height: 3px; background: linear-gradient(90deg,#59636D,#AEB8C0,#59636D); border-radius: 3px; }
.og-rail { display: flex; gap: 16px; overflow-x: auto; padding: 0 4px 28px; scroll-snap-type: x mandatory; scrollbar-width: thin; }
.og-rail::-webkit-scrollbar { height: 6px; }
.og-rail::-webkit-scrollbar-thumb { background: var(--indigo2); border-radius: 6px; }
.og-tick { position: relative; flex: 0 0 218px; scroll-snap-align: start; background: var(--card); color: #191510; text-align: left; border-radius: 3px 3px 10px 10px; padding: 26px 14px 14px; transform-origin: 50% 0; transition: transform .25s cubic-bezier(.2,.9,.3,1.2); display: block; }
.og-grid .og-tick { width: 100%; padding-top: 24px; }
.og-rail .og-tick { margin-top: 30px; }
.og-tick::before { content: ""; position: absolute; top: 11px; left: 50%; transform: translateX(-50%); width: 13px; height: 13px; border-radius: 50%; background: var(--indigo); box-shadow: inset 0 1px 2px rgba(0,0,0,.6); }
.og-rail .og-tick::after { content: ""; position: absolute; top: -30px; left: 50%; width: 2px; height: 36px; background: #A6ADB4; transform: translateX(-50%) rotate(4deg); transform-origin: top center; }
.og-tick:hover, .og-tick:focus-visible { transform: rotate(-1.6deg) translateY(-3px); }
.og-tick[data-sold="1"] { filter: saturate(.25); }
.og-tick[data-sold="1"]:hover { transform: none; }
.og-photo { aspect-ratio: 4/5; border-radius: 2px; display: grid; place-items: center; position: relative; overflow: hidden; margin-bottom: 10px; }
.og-photo-big { aspect-ratio: 1/1; }
.og-photo svg { width: 72%; height: 72%; }
.og-photo-img { object-fit: cover; }
.og-photoflag { position: absolute; right: 5px; bottom: 5px; font-family: var(--mono); font-size: 8px; letter-spacing: .12em; text-transform: uppercase; background: rgba(25,21,16,.62); color: #EDE6D6; padding: 2px 5px; border-radius: 2px; }
.og-no { font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: #6E6455; }
.og-name { font-family: var(--disp); font-weight: 700; text-transform: uppercase; font-size: 21px; line-height: .96; margin: 3px 0 7px; }
.og-name-big { font-size: 34px; margin-top: 14px; color: var(--chalk); }
.og-meta { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #A79C86; padding-top: 8px; }
.og-size { font-family: var(--mono); font-size: 11px; color: #5E5545; letter-spacing: .06em; }
.og-price { font-family: var(--disp); font-weight: 900; font-size: 27px; line-height: 1; }
.og-soldstamp { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.og-soldstamp span { font-family: var(--disp); font-weight: 900; font-size: 40px; letter-spacing: .1em; color: rgba(255,74,15,.9); border: 3px solid rgba(255,74,15,.9); padding: 2px 12px; transform: rotate(-11deg); border-radius: 4px; }
.og-held { position: absolute; top: 26px; left: 0; right: 0; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; background: var(--fluoro); color: #14100C; text-align: center; padding: 3px 0; z-index: 1; }
.og-how { margin: 46px 0 10px; border-top: 1px solid var(--line); padding-top: 26px; }
.og-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: var(--fluoro); margin-bottom: 14px; }
.og-howgrid { display: grid; gap: 1px; grid-template-columns: repeat(auto-fit,minmax(215px,1fr)); background: var(--line); }
.og-howcell { background: var(--indigo); padding: 20px 18px; }
.og-howcell h3 { font-family: var(--disp); font-weight: 700; text-transform: uppercase; font-size: 22px; line-height: 1; margin-bottom: 7px; }
.og-howcell p { color: #B3BEC9; font-size: 14px; }
.og-shop { margin: 52px 0 0; }
.og-shophead { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 16px; }
.og-shophead h2 { font-family: var(--disp); font-weight: 900; text-transform: uppercase; font-size: clamp(38px,7vw,72px); line-height: .85; }
.og-filters { display: flex; gap: 7px; flex-wrap: wrap; }
.og-filters button { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; border: 1px solid var(--line); padding: 6px 12px; border-radius: 999px; color: var(--wash); }
.og-filters button[aria-pressed="true"] { background: var(--chalk); color: var(--indigo); border-color: var(--chalk); }
.og-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill,minmax(210px,1fr)); }
.og-markets { margin: 58px 0 0; border-top: 1px solid var(--line); padding-top: 26px; }
.og-marketrow { display: flex; gap: 18px; align-items: baseline; justify-content: space-between; border-bottom: 1px solid var(--line); padding: 14px 0; flex-wrap: wrap; }
.og-marketrow h3 { font-family: var(--disp); font-weight: 700; text-transform: uppercase; font-size: 26px; line-height: 1; }
.og-when { font-family: var(--mono); font-size: 12px; color: var(--wash); }
.og-marketrow p { color: #B3BEC9; font-size: 14px; flex: 1 1 240px; }
.og-foot { margin-top: 58px; border-top: 1px solid var(--line); padding: 24px 0 60px; display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--wash); }
.og-scrim { position: fixed; inset: 0; background: rgba(10,14,19,.72); z-index: 40; opacity: 0; pointer-events: none; transition: opacity .22s; }
.og-scrim[data-open="1"] { opacity: 1; pointer-events: auto; }
.og-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(440px,100%); z-index: 41; background: var(--indigo2); border-left: 1px solid var(--line); transform: translateX(102%); transition: transform .3s cubic-bezier(.3,.8,.3,1); display: flex; flex-direction: column; color: var(--chalk); font-family: var(--body); }
.og-drawer[data-open="1"] { transform: none; }
.og-drawerhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--line); flex: 0 0 auto; }
.og-drawerhead h2 { font-family: var(--disp); font-weight: 900; text-transform: uppercase; font-size: 26px; line-height: 1; }
.og-close { font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--wash); }
.og-drawerbody { overflow-y: auto; padding: 20px; flex: 1 1 auto; }
.og-drawerfoot { border-top: 1px solid var(--line); padding: 16px 20px; flex: 0 0 auto; background: var(--indigo2); }
.og-cta { display: block; width: 100%; text-align: center; background: var(--fluoro); color: #14100C; font-family: var(--disp); font-weight: 900; text-transform: uppercase; font-size: 22px; letter-spacing: .03em; padding: 13px; border-radius: 3px; }
.og-cta[disabled] { opacity: .4; cursor: not-allowed; }
.og-ghost { display: block; width: 100%; text-align: center; border: 1px solid var(--line); font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; padding: 10px; border-radius: 3px; color: var(--wash); }
.og-care { border: 1px solid var(--line); border-radius: 3px; margin-top: 16px; }
.og-carerow { display: flex; justify-content: space-between; gap: 14px; padding: 9px 12px; border-bottom: 1px solid var(--line); }
.og-carerow:last-child { border-bottom: 0; }
.og-carerow dt { font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--wash); }
.og-carerow dd { font-size: 14px; text-align: right; }
.og-grade { display: inline-block; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; padding: 2px 7px; border-radius: 2px; background: var(--fluoro); color: #14100C; }
.og-line { display: flex; gap: 12px; align-items: flex-start; border-bottom: 1px solid var(--line); padding: 12px 0; }
.og-linethumb { flex: 0 0 54px; aspect-ratio: 4/5; border-radius: 2px; display: grid; place-items: center; overflow: hidden; position: relative; }
.og-linethumb svg { width: 74%; height: 74%; }
.og-linebody { flex: 1; }
.og-linebody h3 { font-family: var(--disp); font-weight: 700; text-transform: uppercase; font-size: 18px; line-height: 1; }
.og-linebody small { font-family: var(--mono); font-size: 11px; color: var(--wash); }
.og-lineend { text-align: right; }
.og-lineprice { font-family: var(--disp); font-weight: 900; font-size: 20px; }
.og-remove { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--fluoro); }
.og-timer { font-family: var(--mono); font-size: 11px; color: var(--fluoro); }
.og-empty { text-align: center; padding: 46px 10px; color: var(--wash); }
.og-empty strong { display: block; font-family: var(--disp); font-weight: 900; font-size: 30px; text-transform: uppercase; color: var(--chalk); margin-bottom: 6px; }
.og-opt { display: block; border: 1px solid var(--line); border-radius: 3px; padding: 13px; margin-bottom: 9px; cursor: pointer; position: relative; }
.og-opt[data-sel="1"] { border-color: var(--fluoro); background: rgba(255,74,15,.07); }
.og-opt h3 { font-family: var(--disp); font-weight: 700; text-transform: uppercase; font-size: 19px; line-height: 1; }
.og-opt small { display: block; color: var(--wash); font-size: 13px; margin-top: 3px; }
.og-optprice { float: right; font-family: var(--disp); font-weight: 900; font-size: 21px; }
.og-opt input { position: absolute; opacity: 0; pointer-events: none; }
.og-field { margin-bottom: 11px; }
.og-field label { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: .13em; text-transform: uppercase; color: var(--wash); margin-bottom: 5px; }
.og-field input, .og-field select { width: 100%; background: var(--indigo); border: 1px solid var(--line); color: var(--chalk); padding: 10px 11px; border-radius: 3px; font: inherit; font-size: 14px; }
.og-totals { border-top: 1px dashed var(--line); margin-top: 14px; padding-top: 12px; }
.og-totrow { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 13px; padding: 3px 0; color: var(--wash); }
.og-totrow.og-big { color: var(--chalk); font-family: var(--disp); font-weight: 900; font-size: 27px; padding-top: 8px; }
.og-dim { color: #B3BEC9; margin-top: 8px; font-size: 14px; }
.og-small { color: #7C93A8; font-size: 13px; margin-top: 14px; }
.og-free { color: var(--fluoro); font-family: var(--mono); font-size: 12px; margin-top: 6px; }
.og-err { margin-top: 10px; border: 1px solid rgba(255,74,15,.5); background: rgba(255,74,15,.08); color: #FFB49A; font-size: 13px; padding: 9px 11px; border-radius: 3px; }
.og-detailsform { display: flex; flex-direction: column; }
.og-doneview { padding: 10px 0; }
.og-donehead { display: block; font-family: var(--disp); font-weight: 900; font-size: 30px; text-transform: uppercase; color: var(--chalk); margin-bottom: 6px; }
.og-demo { position: fixed; left: 12px; bottom: 12px; z-index: 70; background: var(--chalk); color: var(--indigo); border-radius: 4px; font-family: var(--mono); font-size: 11px; padding: 8px 11px; max-width: 280px; line-height: 1.4; box-shadow: 0 6px 24px rgba(0,0,0,.4); }
.og-demo button { float: right; margin-left: 10px; color: var(--fluoro); font-size: 14px; line-height: 1; }
@media (max-width: 620px) { .og-drawer { width: 100%; } .og-facts { margin-left: 0; } }
@media (prefers-reduced-motion: reduce) { .og *, .og *::before, .og *::after { animation: none !important; transition: none !important; } }
`;
