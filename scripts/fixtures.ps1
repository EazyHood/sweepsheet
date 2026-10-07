Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice('Microsoft Zira Desktop')
$voice.Rate = -1
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$cases = @(
  @{id='01-clear';text='I collected three plastic bottles and two cans.'},
  @{id='02-several';text='Four wrappers, six cigarette butts, and one glass bottle.'},
  @{id='03-correction';text='Make that two plastic bottles, not three.'},
  @{id='04-uncertain';text='Maybe four or five wrappers.'},
  @{id='05-vague';text='I picked up some cans.'},
  @{id='06-not-collected';text='I saw six plastic bottles but did not collect them.'},
  @{id='09-zero';text='Zero glass bottles and two other items.'},
  @{id='10-large';text='Twenty three wrappers and twelve cans.'}
)
foreach ($case in $cases) {
  $path = Join-Path (Get-Location) ('public/samples/'+$case.id+'.wav')
  $voice.SetOutputToWaveFile($path, $format)
  $voice.Speak($case.text)
  $voice.SetOutputToNull()
}
$cases | ConvertTo-Json | Set-Content -LiteralPath 'public/samples/manifest.json' -Encoding utf8
$voice.Dispose()
