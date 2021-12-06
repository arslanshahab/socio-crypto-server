export const initDateFromParams = (date = new Date(), day = new Date().getDate(), hours = 0, min = 0, sec = 0) => {
    date.setDate(day);
    date.setHours(hours);
    date.setMinutes(min);
    date.setSeconds(sec);
    return date;
};
