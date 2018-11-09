const moment = require('moment-timezone');
const scheduler = require('node-schedule');
const holidays = require('@18f/us-federal-holidays');

const CHANNEL = process.env.HUBOT_HOLIDAY_REMINDER_CHANNEL || 'general';
const TIMEZONE =
  process.env.HUBOT_HOLIDAY_REMINDER_TIMEZONE || 'America/New_York';
const reportingTime = moment(
  process.env.HUBOT_HOLIDAY_REMINDER_TIME || '15:00',
  'HH:mm'
);

const getNextHoliday = () => {
  const now = moment.tz(TIMEZONE);
  return holidays
    .allForYear(now.year())
    .concat(holidays.allForYear(now.year() + 1))
    .map(h => ({
      ...h,
      date: moment.tz(h.dateString, 'YYYY-MM-DD', TIMEZONE)
    }))
    .filter(h => h.date.isAfter(now))
    .shift();
};

const previousWeekday = date => {
  const source = moment(date);
  source.subtract(1, 'day');

  let dow = source.format('dddd');
  while (dow === 'Saturday' || dow === 'Sunday') {
    source.subtract(1, 'day');
    dow = source.format('dddd');
  }

  return source;
};

const postReminder = (robot, holiday) => {
  robot.messageRoom(
    CHANNEL,
    `@here Remember that *${holiday.date.format(
      'dddd'
    )}* is a federal holiday for the observation of *${holiday.name}*!`
  );
};

const scheduleReminder = (
  robot,
  fn = { getNextHoliday, previousWeekday, postReminder, scheduler }
) => {
  const nextHoliday = fn.getNextHoliday();
  const target = fn.previousWeekday(nextHoliday.date);

  target.hour(reportingTime.hour());
  target.minute(reportingTime.minute());

  fn.scheduler.scheduleJob(target.toDate(), () => {
    fn.postReminder(robot, nextHoliday);

    // Tomorrow, schedule the next holiday reminder
    fn.scheduler.scheduleJob(target.add(1, 'day').toDate(), () => {
      scheduleReminder(robot);
    });
  });
};

module.exports = scheduleReminder;

// Expose for testing
module.exports.testing = {
  getNextHoliday,
  postReminder,
  previousWeekday,
  scheduleReminder
};
