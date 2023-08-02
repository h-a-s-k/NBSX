<div align="center">
<a href="https://gitgud.io/ahsk/nbsx">
<h1>NBSX</h1>
  <img
    height="120"
    width="120"
    alt="NBSX"
    title="NBSX"
    src="https://gitgud.io/ahsk/nbsx/raw/master/logo.png"
    align="left"
  />

coom & doom
</a>
<br>
<br>
<br>
<br>
<hr>
<a href="https://gitgud.io/ahsk/nbsx/-/archive/master/nbsx-master.zip">
   <img src="https://gitgud.io/ahsk/nbsx/raw/master/program.png">
</a>
<h2><a href="https://gitgud.io/ahsk/nbsx/blob/master/CHANGELOG.md">CHANGELOG</a></h2>
</div>

## Requirements

nodejs>=20.4.*

## Defaults

### SettingName: (DEFAULT)/opt1/opt2

 1. `PromptExperiment`: (true)/false
    * true is an alternative way to send your prompt to the AI
    * experiment before setting to false

 2. `RenewAlways`: (false)/true
    * true creates a new conversation, sending all messages each time
    * false sends only latest assistant->user messages
    * experiment before setting to true

 3. `SystemExperiments`: (true)/false
    * only has effect when RenewAlways is set to false
    * no effect on very first message
    * true sends the last system prompt (typically your jailbreak) followed by assistant->user messages
       * on hitting `SystemInterval` messages, sends all system prompts followed by assistant->user messages
    * false sends all system prompts with every message

## Downloads

> ### [Download latest version](https://gitgud.io/ahsk/nbsx/-/archive/master/nbsx-master.zip)