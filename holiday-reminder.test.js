/* global describe, it, beforeEach */

const expect = require('chai').expect;
const moment = require('moment-timezone');
const sinon = require('sinon');

let {
  getNextHoliday,
  previousWeekday,
  postReminder,
  scheduleReminder
} = require('./holiday-reminder').testing;

const reload = () => {
  delete require.cache[require.resolve('./holiday-reminder')];
  const lib = require('./holiday-reminder').testing; // eslint-disable-line global-require

  getNextHoliday = lib.getNextHoliday;
  previousWeekday = lib.previousWeekday;
  postReminder = lib.postReminder;
  scheduleReminder = lib.scheduleReminder;
};

describe('holiday reminder', () => {
  const sandbox = sinon.createSandbox();

  const robot = {
    messageRoom: sandbox.spy()
  };

  const functionMocks = {
    getNextHoliday: sandbox.stub(),
    previousWeekday: sandbox.stub(),
    postReminder: sandbox.stub(),
    scheduler: {
      scheduleJob: sandbox.stub()
    }
  };

  beforeEach(() => {
    delete process.env.HUBOT_HOLIDAY_REMINDER_CHANNEL;
    delete process.env.HUBOT_HOLIDAY_REMINDER_SUPPRESS_HERE;
    delete process.env.HUBOT_HOLIDAY_REMINDER_TIME;
    delete process.env.HUBOT_HOLIDAY_REMINDER_TIMEZONE;
    reload();

    sandbox.reset();
  });

  describe('gets the next holiday', () => {
    it('defaults to America/New_York time', () => {
      // Midnight on May 28 in eastern timezone
      const clock = sinon.useFakeTimers(
        +moment.tz('2012-05-28', 'YYYY-MM-DD', 'America/New_York').format('x')
      );

      const nextHoliday = getNextHoliday();

      expect(moment(nextHoliday.date).isValid()).to.equal(true);

      // remove this from the object match, otherwise
      // it becomes a whole big thing, dependent on
      // moment not changing its internal object structure
      delete nextHoliday.date;

      expect(nextHoliday).to.eql({
        name: 'Independence Day',
        dateString: '2012-7-4'
      });
      clock.restore();
    });

    it('defaults to America/New_York time', () => {
      process.env.HUBOT_HOLIDAY_REMINDER_TIMEZONE = 'America/Chicago';
      reload();

      // Midnight on May 28 in US eastern timezone.  Because our reminder
      // timezone is US central timezone, "now" is still May 27, so the
      // "next" holiday should be May 28 - Memorial Day
      const clock = sinon.useFakeTimers(
        +moment.tz('2012-05-28', 'YYYY-MM-DD', 'America/New_York').format('x')
      );

      const nextHoliday = getNextHoliday();

      expect(moment(nextHoliday.date).isValid()).to.equal(true);

      // remove this from the object match, otherwise
      // it becomes a whole big thing, dependent on
      // moment not changing its internal object structure
      delete nextHoliday.date;

      expect(nextHoliday).to.eql({
        name: 'Memorial Day',
        dateString: '2012-5-28'
      });
      clock.restore();
    });
  });

  describe('gets the previous weekday', () => {
    [
      {
        title: 'gets Friday from Saturday',
        start: new Date(2018, 10, 10),
        end: '2018-11-09'
      },
      {
        title: 'gets Friday from Sunday',
        start: new Date(2018, 10, 11),
        end: '2018-11-09'
      },
      {
        title: 'gets Friday from Monday',
        start: new Date(2018, 10, 12),
        end: '2018-11-09'
      },
      {
        title: 'gets Monday from Tuesday',
        start: new Date(2018, 10, 13),
        end: '2018-11-12'
      },
      {
        title: 'gets Tuesday from Wednesday',
        start: new Date(2018, 10, 14),
        end: '2018-11-13'
      },
      {
        title: 'gets Wednesday from Thursday',
        start: new Date(2018, 10, 15),
        end: '2018-11-14'
      },
      {
        title: 'gets Thursday from Friday',
        start: new Date(2018, 10, 16),
        end: '2018-11-15'
      }
    ].forEach(({ title, start, end }) => {
      it(title, () => {
        const out = previousWeekday(start).format('YYYY-MM-DD');
        expect(out).to.equal(end);
      });
    });
  });

  describe('posts a reminder', () => {
    it('defaults to #general', () => {
      postReminder(robot, {
        date: moment('2018-11-12', 'YYYY-MM-DD'),
        name: 'Test Holiday'
      });

      expect(
        robot.messageRoom.calledWith(
          'general',
          '@here Remember that *Monday* is a federal holiday for the observation of *Test Holiday*!'
        )
      ).to.equal(true);
    });

    it('honors the HUBOT_HOLIDAY_REMINDER_CHANNEL env var', () => {
      process.env.HUBOT_HOLIDAY_REMINDER_CHANNEL = 'fred';
      reload();

      postReminder(robot, {
        date: moment('2018-11-12', 'YYYY-MM-DD'),
        name: 'Test Holiday'
      });

      expect(
        robot.messageRoom.calledWith(
          'fred',
          '@here Remember that *Monday* is a federal holiday for the observation of *Test Holiday*!'
        )
      ).to.equal(true);
    });

    describe('honors the HUBOT_HOLIDAY_REMINDER_SUPPRESS_HERE env var', () => {
      ['true', 'yes', 'y', '1', '100'].forEach(flag => {
        it(`suppresses if the env var is set to "${flag}"`, () => {
          process.env.HUBOT_HOLIDAY_REMINDER_SUPPRESS_HERE = flag;
          reload();

          postReminder(robot, {
            date: moment('2018-11-12', 'YYYY-MM-DD'),
            name: 'Test Holiday'
          });

          expect(
            robot.messageRoom.calledWith(
              'general',
              'Remember that *Monday* is a federal holiday for the observation of *Test Holiday*!'
            )
          ).to.equal(true);
        });
      });

      ['false', 'no', 'n', '0', ''].forEach(flag => {
        it(`does not suppress if the env var is set to "${flag}"`, () => {
          process.env.HUBOT_HOLIDAY_REMINDER_SUPPRESS_HERE = flag;
          reload();

          postReminder(robot, {
            date: moment('2018-11-12', 'YYYY-MM-DD'),
            name: 'Test Holiday'
          });

          expect(
            robot.messageRoom.calledWith(
              'general',
              '@here Remember that *Monday* is a federal holiday for the observation of *Test Holiday*!'
            )
          ).to.equal(true);
        });
      });
    });
  });

  describe('schedules a reminder', () => {
    it('defaults to 15:00', () => {
      const nextHoliday = { date: 'in the future' };
      functionMocks.getNextHoliday.returns(nextHoliday);

      const weekdayBefore = moment('2000-01-01', 'YYYY-MM-DD');
      functionMocks.previousWeekday.returns(weekdayBefore);

      scheduleReminder(robot, functionMocks);

      expect(
        functionMocks.previousWeekday.calledWith('in the future')
      ).to.equal(true);
      expect(weekdayBefore.hour()).to.equal(15);
      expect(weekdayBefore.minute()).to.equal(0);

      expect(
        functionMocks.scheduler.scheduleJob.calledWith(
          sinon.match(v => moment(v).isSame(weekdayBefore)),
          sinon.match.func
        )
      ).to.equal(true);

      // call the scheduled job
      functionMocks.scheduler.scheduleJob.args[0][1]();

      expect(
        functionMocks.postReminder.calledWith(robot, nextHoliday)
      ).to.equal(true);

      expect(
        functionMocks.scheduler.scheduleJob.calledWith(
          sinon.match(v => moment(v).isSame(weekdayBefore)),
          sinon.match.func
        )
      ).to.equal(true);
      expect(functionMocks.scheduler.scheduleJob.calledTwice).to.equal(true);
    });

    it('respects HUBOT_HOLIDAY_REMINDER_TIME', () => {
      process.env.HUBOT_HOLIDAY_REMINDER_TIME = '04:32';
      reload();

      const nextHoliday = { date: 'in the future' };
      functionMocks.getNextHoliday.returns(nextHoliday);

      const weekdayBefore = moment('2000-01-01', 'YYYY-MM-DD');
      functionMocks.previousWeekday.returns(weekdayBefore);

      scheduleReminder(robot, functionMocks);

      expect(
        functionMocks.previousWeekday.calledWith('in the future')
      ).to.equal(true);
      expect(weekdayBefore.hour()).to.equal(4);
      expect(weekdayBefore.minute()).to.equal(32);

      expect(
        functionMocks.scheduler.scheduleJob.calledWith(
          sinon.match(v => moment(v).isSame(weekdayBefore)),
          sinon.match.func
        )
      ).to.equal(true);

      // call the scheduled job
      functionMocks.scheduler.scheduleJob.args[0][1]();

      expect(
        functionMocks.postReminder.calledWith(robot, nextHoliday)
      ).to.equal(true);

      expect(
        functionMocks.scheduler.scheduleJob.calledWith(
          sinon.match(v => moment(v).isSame(weekdayBefore)),
          sinon.match.func
        )
      ).to.equal(true);
      expect(functionMocks.scheduler.scheduleJob.calledTwice).to.equal(true);
    });
  });
});
