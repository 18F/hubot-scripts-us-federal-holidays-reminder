/* global describe, it, before, beforeEach */

const expect = require('chai').expect;
const moment = require('moment');
const sinon = require('sinon');

const {
  getNextHoliday,
  previousWeekday,
  postReminder,
  scheduleReminder
} = require('./holiday-reminder').testing;

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
    sandbox.reset();
  });

  it('gets the next holiday', () => {
    const clock = sinon.useFakeTimers(new Date(2012, 5, 25).getTime());

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

  it('posts a reminder', () => {
    postReminder(robot, {
      date: moment('2018-11-12', 'YYYY-MM-DD'),
      name: 'Test Holiday'
    });

    expect(
      robot.messageRoom.calledWith(
        'general',
        '@here Remember that *Monday* is a federal holiday for the observation of *Test Holiday*'
      )
    );
  });

  it('schedules a reminder', () => {
    const nextHoliday = { date: 'in the future' };
    functionMocks.getNextHoliday.returns(nextHoliday);

    const weekdayBefore = moment('2000-01-01', 'YYYY-MM-DD');
    functionMocks.previousWeekday.returns(weekdayBefore);

    scheduleReminder(robot, functionMocks);

    expect(functionMocks.previousWeekday.calledWith('in the future')).to.equal(
      true
    );
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

    expect(functionMocks.postReminder.calledWith(robot, nextHoliday)).to.equal(
      true
    );

    expect(
      functionMocks.scheduler.scheduleJob.calledWith(
        sinon.match(v => moment(v).isSame(weekdayBefore)),
        sinon.match.func
      )
    ).to.equal(true);
    expect(functionMocks.scheduler.scheduleJob.calledTwice).to.equal(true);
  });
});
