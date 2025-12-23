# custom-rpc

A very quick and simple app to connect to Discord's Rich Presence server via RPC (Remote Procedure Call).

![example screenshot](images/ex_screenshot.png)

## Usage

## Bare minimum

Clone the repo, install dependencies, edit the config file, and run the app. Simple.

```bash
git clone https://github.com/ackledotdev/custom-rpc.git # gh repo clone ackledotdev/custom-rpc
cd custom-rpc
npm i
${EDITOR:-vim} config.jsonc # Edit the config file
npm start
```

> [!IMPORTANT]
> Running the app with the default config file will produce something similar to the sample image, assuming that is up-to-date.
> You must edit the config file and specify your own Client ID from the Discord Developer Portal to add your own images. See "Advanced setup". If you are not using images, this will not be necessary, but you must comment out the image section to hide the images.

## Advanced setup

1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications) and copy the Client/Application ID. No other fields need to be changed. They will not affect the Rich Presence.
2. Enter your Client ID in the config file.
3. Upload images to the Rich Presence art assets tab of your application settings. Ensure the images are keyed properly before saving.
4. In the config file, update the image keys to match the keys of the uploaded images. Edit hover text as desired.
5. Run the app with `npm start`.
