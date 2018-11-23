# hubot-scripts-us-federal-holidays-reminder

Hubot script that posts reminders about upcoming federal holidays. It will
post on the weekday preceding a holiday.

## Installation

In Hubot project directory, run:

`npm install hubot-scripts-us-federal-holidays-reminder --save`

Then add the script to your `external-scripts.json`:

```
[
  "hubot-scripts-us-federal-holidays-reminder"
]
```

## Configuration

The script understands three environment variables:

| variable                             | default            | purpose                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HUBOT_HOLIDAY_REMINDER_TIME          | `15:00`            | What time each day to check if a reminder is necessary and post if it is. This is in 24-hour format.                                                                                                                          |
| HUBOT_HOLIDAY_REMINDER_TIMEZONE      | `America/New_York` | The timezone the bot should use when considering whether or not it's time to post a reminder. You can find a [list of valid timezone identifiers](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) on Wikipedia. |
| HUBOT_HOLIDAY_REMINDER_CHANNEL       | `general`          | The name of the channel reminders should be posted to.                                                                                                                                                                        |
| HUBOT_HOLIDAY_REMINDER_SUPPRESS_HERE | false              | If set to 'true', 'yes', or a positive nonzero number, the bot will **_not_** precede the message with `@here`                                                                                                                |

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related rights in the work worldwide are waived through the [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).

> All contributions to this project will be released under the CC0 dedication. By submitting a pull request, you are agreeing to comply with this waiver of copyright interest.
