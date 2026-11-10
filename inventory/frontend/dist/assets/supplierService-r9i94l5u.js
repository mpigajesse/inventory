import{l as s,y as a}from"./index-zewb1YCK.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i=s("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]),c={getAll:e=>a.get("/suppliers/",{params:e}).then(t=>t.data),getById:e=>a.get(`/suppliers/${e}/`).then(t=>t.data),create:e=>a.post("/suppliers/",e).then(t=>t.data),update:(e,t)=>a.patch(`/suppliers/${e}/`,t).then(p=>p.data),delete:e=>a.delete(`/suppliers/${e}/`).then(t=>t.data)};export{i as M,c as s};
