---
title: Always 64bit PowerShell Execution
slug: always-64bit-powershell-execution
date: June 22, 2019
categories: 
  - PowerShell
  - AWS
  - AWS CodeDeploy
---

Some time ago, I had a need for my PowerShell scripts to be always executed in a 64-bit process. The exact reason escapes me for the moment, though a quick search shows this requirement is somewhat common enough, and I figured I would write a blog about the solution I ended up using to solve it.

For a minimal effort solution to solve such a problem, one might do something like the following:

```powershell
if ($PsRootPath -NotLike "*SysWOW64*") {
    Write-Error "Please run this script in a 64-bit console"
    exit 1
}
```

Great! If a caller of my script was to use a 32-bit version of PowerShell, they would be presented with a message telling them to change to the 64-bit version; we’d also set the exit code to 1, as we are not monsters! For a simple use case, this would be fine. Sure, it is not exactly great user experience, but hey, it gets the job done and the justification could be the script is of low value and not worth the extra effort.

However, there are situations where the script is of high value, say part of an automated deployment process, and the control of the bitness is something of a pipedream – I am looking at you [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)! [Luke, answering a similar question on ServerFault](https://serverfault.com/a/783858/134867), has suggested adding the following snippet of code to the top of PowerShell scripts:

```powershell
if ($PSHOME -like "*SysWOW64*")
{
  Write-Warning "Restarting this script under 64-bit Windows PowerShell."

  & (Join-Path ($PSHOME -replace "SysWOW64", "SysNative") powershell.exe) -File `
    (Join-Path $PSScriptRoot $MyInvocation.MyCommand) @args

  # Exit 32-bit script.
  Exit $LastExitCode
}

# Your 64-bit script code follows here...
Write-Output "64bit only"
```

Good, the problem has been solved for a single script. Though Luke’s solution at face-value seems fine, what if the deployment was more complex, what if you had a spec file like the following?

```yaml
version: 0.0
os: windows
hooks:
  BeforeInstall:
    - location: .\CodeDeploy\Scripts\Remove-Websites.ps1
    - location: .\CodeDeploy\Scripts\Remove-ScheduledTasks.ps1
    - location: .\CodeDeploy\Scripts\Remove-Services.ps1
    - location: .\CodeDeploy\Scripts\Update-Deployment.ps1
  AfterInstall:
    - location: .\CodeDeploy\Scripts\Add-Websites.ps1
    - location: .\CodeDeploy\Scripts\Add-ScheduledTasks.ps1
    - location: .\CodeDeploy\Scripts\Add-Services.ps1
    - location: .\CodeDeploy\Scripts\Update-Db.ps1
    - location: .\CodeDeploy\Scripts\Start-Websites.ps1
    - location: .\CodeDeploy\Scripts\Send-SlackNotification.ps1
```

Uh-oh. Without due care, you will probably end up reusing this ~~code~~ snippet over and over again, which is a code script smell. Did somebody mention DRY (Don’t repeat yourself)? Good work.

What we need is a better way. A reusable way. Lucky for us, with the power of PowerShell modules we can address this in a clean manner. I am not going to go into detail about modules, as that is a little off the path of what this post is about, though I will say you can think of them as, simply, as a single or collection of callable functions.

Avoiding a DRY violation, we would declare our module like so:

```powershell
Function Use-64Bit {
    [CmdletBinding()]
    [OutputType([Bool])]
    Param (
        [parameter(Mandatory = $True)]
        [String]
        $PsRootPath,
        [parameter(Mandatory = $True)]
        [String]
        $ScriptRootPath,
        [parameter(Mandatory = $True)]
        [String]
        $ScriptFilePath
    )
    Process {
        # Are you running in 32-bit mode?
        #   (\SysWOW64\ = 32-bit mode)
        if ($PsRootPath -like "*SysWOW64*") {
            Write-Warning "Restarting this script under 64-bit Windows PowerShell."

            # Restart this script under 64-bit Windows PowerShell.
            #   (\SysNative\ redirects to \System32\ for 64-bit mode)
            & (Join-Path ($PsRootPath -replace "SysWOW64", "SysNative") powershell.exe) `
                -NonInteractive `
                -NoProfile `
                -File (Join-Path $ScriptRootPath ([System.IO.Path]::GetFileName($ScriptFilePath))) `
                2>&1 | Tee-Object -Variable allOutput

            Write-Host ($allOutput | Format-List | Out-String)

            return $TRUE
        }
        return $FALSE
    }
}
```

A side note. My convention for naming PowerShell Modules is fairly straightforward. If the module contains a single function, then name it after that function; otherwise, where there is more than one function, name it after what the group of functions represent. For example, if I had a set of functions for acting on IIS, then I would likely name it `IIS-Utilities.psm1`.

For this module, as it contains a single function, I will name it `Use-64Bit.psm1`. 

The file extension of `.psm1` is the convention for PowerShell modules.

Brillant! We have our module and It is reusable. Let us go test it! Below is a little test script which will use the module and output an object with a message `64 bit ahoy`. 

```powershell
Set-Location ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
[Environment]::CurrentDirectory = ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
Import-Module ".\Modules\Use-64Bit.psm1" -Force

$32bitRun = Use-64Bit -PsRootPath $PSHOME -ScriptRootPath $PSScriptRoot -ScriptFilePath $MyInvocation.MyCommand
if ($32BitRun -eq $TRUE) { exit $LastExitCode }

Write-Output { Message = "64 bit ahoy" }
```

You will notice that I include the module using the following syntax:

```powershell
Import-Module ".\Modules\Use-64Bit.psm1" -Force
```

The command is `Import-Module` followed by the path where it can be found and finally the argument `-Force`. All this is pretty straight forward, except for the force argument. Setting this argument tells PowerShell to **not** load the cached version of the module and to read it from disk. I do this out of habit, as more than once before I have been bitten by this caching behaviour.

And, that should do it. On with the tests!

Test 1 – Execution in a 32 bit PowerShell console

![PS32 Bit Test](/always-64bit-powershell-execution/PS32Bit-Test.png)

Great! We can see a warning telling us the script will restart and be executed under a 64 bit PowerShell console, and we also see an outputted object with the message `64 bit ahoy`!

Test 2 – Execution in a 64 bit PowerShell console

![PS64 Bit Test](/always-64bit-powershell-execution/PS64Bit-Test.png)

Again, we see the `64 bit ahoy message`, but this time, as expected, there was no warning.

Lastly, the astute reader will have noticed this little snippet of script `2>&1 | Tee-Object -Variable allOutput`. I will not get into stream redirection in the post, but what I have done here is captured the steam output – all flavours – into the variable `allOutput`, which I then write to the host (tsk tsk, I know ?). Additionally, because I’ve used [Tee-Object](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/tee-object?view=powershell-6) , which like the letter T implies, splits the stream into two, means the stream continues down the pipeline.

What would happen without it?

![PS32 Bit No Capture Test](/always-64bit-powershell-execution/PS32Bit-No-Capture-Test.png)

That is right, all the output is lost. Well, maybe not lost in a technical sense, but I will not see it from the 32-bit console.

Source files can be downloaded from [Github](https://github.com/pleb/blogging-stash/tree/master/Powershell/Always64Bit).

Further reading:

- [Understanding Streams, Redirection, and Write-Host in PowerShell](https://devblogs.microsoft.com/scripting/understanding-streams-redirection-and-write-host-in-powershell/)
- [PowerShell Module Gallery](https://www.powershellgallery.com/)
- [How to Write a PowerShell Script Module](https://docs.microsoft.com/en-us/powershell/developer/module/how-to-write-a-powershell-script-module)
