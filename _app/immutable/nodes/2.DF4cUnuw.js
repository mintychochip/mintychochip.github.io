import{s as p,e as l,d as m,f as u,i,p as f,k as d,l as _,t as $,h}from"../chunks/scheduler.Dy2IUiju.js";import{S as v,i as g,c as b,b as k,m as x,t as q,a as y,d as z}from"../chunks/index.D-d9KVHK.js";import{g as B,b as D}from"../chunks/entry.DjFUAfSN.js";import{B as E}from"../chunks/Button.CTFRaB5O.js";function H(o){let t;return{c(){t=$("Hello")},l(e){t=h(e,"Hello")},m(e,n){d(e,t,n)},d(e){e&&i(t)}}}function I(o){let t,e,n,c;return n=new E({props:{$$slots:{default:[H]},$$scope:{ctx:o}}}),n.$on("click",o[0]),{c(){t=l("div"),e=l("div"),b(n.$$.fragment),this.h()},l(a){t=m(a,"DIV",{class:!0});var s=u(t);e=m(s,"DIV",{class:!0});var r=u(e);k(n.$$.fragment,r),r.forEach(i),s.forEach(i),this.h()},h(){f(e,"class","sub-container svelte-qu441z"),f(t,"class","container svelte-qu441z")},m(a,s){d(a,t,s),_(t,e),x(n,e,null),c=!0},p(a,[s]){const r={};s&2&&(r.$$scope={dirty:s,ctx:a}),n.$set(r)},i(a){c||(q(n.$$.fragment,a),c=!0)},o(a){y(n.$$.fragment,a),c=!1},d(a){a&&i(t),z(n)}}}function S(o){return[()=>{B(D+"/hello")}]}class j extends v{constructor(t){super(),g(this,t,S,I,p,{})}}export{j as component};