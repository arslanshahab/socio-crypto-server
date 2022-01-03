export const initDateFromParams = (obj: {
    date?: Date;
    y?: number;
    m?: number;
    d?: number;
    h?: number;
    i?: number;
    s?: number;
    ms?: number;
}) => {
    const date = obj.date || new Date();
    if (obj.y) date.setFullYear(obj.y);
    if (obj.m) date.setMonth(obj.m);
    if (obj.d) date.setDate(obj.d);
    if (obj.h) date.setHours(obj.h);
    if (obj.i) date.setMinutes(obj.i);
    if (obj.s) date.setSeconds(obj.s);
    if (obj.ms) date.setMilliseconds(obj.ms);
    return date;
};
