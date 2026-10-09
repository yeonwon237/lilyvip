import { t } from '../../i18n';
import React, { useSyncExternalStore } from 'react';
import { Check } from 'lucide-react';
export const colorThemes = [
 {id:'original',get name() { return t("Cam & Rừng"); },accent:'#e25c38',primary:'#1b3b36'},
 {id:'ocean',get name() { return t("Đại dương"); },accent:'#387bd1',primary:'#214b78'},
 {id:'plum',get name() { return t("Mận chín"); },accent:'#9861b4',primary:'#624273'},
 {id:'earth',get name() { return t("Đất ấm"); },accent:'#ad7444',primary:'#66513d'},
];
const read = () => {try {const id=localStorage.getItem('LILY_COLOR_THEME_V1');return colorThemes.some(t=>t.id===id)?id!:'original';} catch {return 'original';}};
const subscribe=(listener:()=>void)=>{window.addEventListener('lily-color-theme',listener);window.addEventListener('storage',listener);return()=>{window.removeEventListener('lily-color-theme',listener);window.removeEventListener('storage',listener);};};
export const useColorTheme=()=>useSyncExternalStore(subscribe,read,()=> 'original');
export function ColorThemes(){
 const selected=useColorTheme();
 return <div className="lily-color-options">{colorThemes.map(t=><button key={t.id} type="button" aria-label={`Theme ${t.name}`} aria-pressed={selected===t.id} onClick={()=>{localStorage.setItem('LILY_COLOR_THEME_V1',t.id);window.dispatchEvent(new Event('lily-color-theme'));}}><span className="lily-theme-swatches"><i style={{background:t.accent}}/><i style={{background:t.primary}}/></span>{selected===t.id&&<Check size={15}/>}</button>)}</div>;
}
