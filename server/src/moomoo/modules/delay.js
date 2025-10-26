
export const LOCAL = false;

const ping = LOCAL ? 60 : 0;
const p2 = ping * .5;

export const delay = () => new Promise(x => setTimeout(x, p2));