# GNUBot Wiki | Application Setup

<!-- header img -->

The first step towards successfully making and running your own Discord Bot is to create your Discord Application.

To start on creating your new application, you first need to head over to [Discord Developers](https://discord.com/developers/applications) where you will log in if you are not logged in.

Once you have navigated over to Discord Developers and you have logged in, you should be on the Applications tab. In the top right corner, you should see a button labeled "New Application".

After finding the button to create a new application, you click on it and a popup will appear. Once the popup appears, you will fill in the application name, or your Discord Bot's name, and select which team should it be in, by default it will be under your account. Once that has been filled out, accept the terms and create your very own application.

Once your application has been created, it will redirect you to your application's general information page. You can configure your application icon, name, description, tags, and more on this page.

When you are satisified with your configurations, you then will navigate over to the Installation page. On this page, if you are making this bot for personal use, configure the Install Link to be None and untick User Install.

When the Installation has been configured, naviagte over to the Bot page where you can configure your Discord Bot's profile picture, banner, username, and more. When you have done so, click on Reset Token to reset its token and regenerate a new one. When it has been reset, copy it and paste it into a secure area.

> [!CAUTION]
> **Never share your Discord Bot's Token or Client Secret for security reasons. People with your Discord Bot's token can gain access and cause damage to your server(s).**

After copying your token, if you are using the Discord Bot for personal use, you may untick public bot. You **must** tick the following for the Discord Bot to work:
- Presence Intent.
- Server Members Intent.
- Message Content Intent.

When the Bot page has been configured, you can now navigate over to the OAuth2 page, the last step. On this page, you need to generate the OAuth2 URL to be able to add the bot. Please make sure you have the following checked off:
- bot.
- applications.commands.

Then, bot permissions will appear. Tick off Administrator to allow the bot to function properly. Then, at the bottom you will see Integration Type, which should be Guild Install.

When everything has been checked off and set properly, you can copy the URL and paste it into your browser, which will direct you to the Discord App to where you can add the discord bot.

> [!NOTE]
> You must have Manage Server in the discord server you want to add the bot in, and additionally have administrator permissions. If Public Bot has been ticked off, only you can add the bot.

Once you have added it to your Discord Server, you have successfully setup your application and you can now continue with the setup and installation. Congratulations!

<h4>
 <picture>
  <source media="(prefers-color-scheme: dark)" srcset="img/readme/dark/Join-us-at-our-Discord-Server!.png">
  <source media="(prefers-color-scheme: light)" srcset="img/readme/light/Join-us-at-our-Discord-Server!.png">
  <img alt="Join Us" src="img/readme/dark/Join-us-at-our-Discord-Server!.png">
 </picture>
</h4>

For any questions, suggestions, or conerns, feel free to open an issue or reach out via GitHub or Join our [Discord Community Server](https://discord.gg/D96MATaPBe).

![GNUBot Roadmap](img/Roadmap.png)

Enjoy using GNUBot! Made with ♥️ by GNUBot Team.

Consider contributing to the project and soon enough (if i even set this up) buy me some coffee! 
