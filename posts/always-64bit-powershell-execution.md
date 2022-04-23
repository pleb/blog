---
title: Always 64bit PowerShell Execution
slug: always-64bit-powershell-execution
date: June 22, 2019
categories:
  - PowerShell
  - AWS
  - AWS CodeDeploy
---

Some time ago, I needed a few PowerShell scripts to be executed in a 64-bit process regardless of whether they were called from a 32 or 64 bit shell. The exact reason escapes me, though a quick search shows this requirement is somewhat common enough. Given the search results, I figured I would write a blog about the solution I ended up using to solve it.

A minimal effort solution to solve such a problem could be something like the following:

```powershell
if ($PsRootPath -NotLike "*SysWOW64*") {
    Write-Error "Please run this script in a 64-bit console"
    exit 1
}
```

Great! If a script caller was using a 32 bit shell, they would be presented with a message telling them to change to the 64 bit shell. The solution also sets the exit code to 1, as A) I'm not a monster, and B) if the caller is an application/code etc it should trigger a better fail experience. Without setting the exit code the caller might not realise that there was an error and continue the execution under the belief the script executed successfully.

However, there are certain situations where the bitness of the shell is out of one's control or the willingness to "can it just work" is paramount.

The bitness control is something I ran into when using [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)! Hmm. Maybe I just remember why I needed this solution in the first place. Congrats to me!

To answer this, [Luke, answering a similar question on ServerFault](https://serverfault.com/a/783858/134867), has suggested adding the following snippet of code to the top of PowerShell scripts:

"`powershell
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

Great. This works well for a couple of scripts. But what if you had more than a couple, or what if the scripts formed a formal pipeline line? Well, in the case of AWS Code Deploy, the deployment pipeline may look a little like

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

Uh-oh. Without due care, we would probably end up reusing Luke's code snippet repeatedly at the top of each file. So what's the problem here? The main issue is that we're in violation of the DRY (Don't repeat yourself) rule. And so what exactly is the issue then? If we need to change how the switch from 32 to 64 bit happens, we would need to make the same edits for each file. Not to forget, it would be easy to miss a modification or for the switch logic to drift from one file to the next.

What is a better way? A reusable way? Lucky for us, we can achieve this using a PowerShell module. PS modules allow us to define and call functions in scripts with minimal effort.

A PS function based on Luke's original snippet could be:

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
        # Running in 32-bit mode?
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

A side note. My convention for naming PowerShell Modules is relatively straightforward. If the module contains a single function, name it after that function; otherwise, name it using a collective noun where there is more than one function. For example, a set of PS functions for configuring IIS might be named `IIS-Utilities.psm1`.

For this module, as it contains a single function, I will name it `Use-64Bit.psm1`.

The file extension of `.psm1` is the convention for PowerShell modules.

Brilliant! I have my module, and it's reusable. Let me show it to you by printing '64 bit ahoy`. Whether I run the script in the 32 or 64 bit shell, I'll get the message '64 bit ahoy` with the only difference being the one executed in the 32 bit shell will include a warning.

The test script

```powershell
Set-Location ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
[Environment]::CurrentDirectory = ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
Import-Module ".\Modules\Use-64Bit.psm1" -Force

$32bitRun = Use-64Bit -PsRootPath $PSHOME -ScriptRootPath $PSScriptRoot -ScriptFilePath $MyInvocation.MyCommand
if ($32BitRun -eq $TRUE) { exit $LastExitCode }

Write-Output { Message = "64 bit ahoy" }
```

Notice that I include the module using the following syntax:

```powershell
Import-Module ".\Modules\Use-64Bit.psm1" -Force
```

The command is `Import-Module` followed by the path where it can be found and finally the argument `-Force`. All this is pretty straightforward, except for the force argument. Setting this argument tells PowerShell to **not** load the module's cached version and read it from disk. I do this out of habit, as I have been bitten by this caching behaviour more than once.

Test 1 – Execution in a 32 bit PowerShell console

![PS32 Bit Test](/always-64bit-powershell-execution/PS32Bit-Test.png)

Great! We can see a warning telling us the script will restart and be executed under a 64 bit PowerShell console, and also we see an outputted object with the message '64 bit ahoy`!

Test 2 – Execution in a 64 bit PowerShell console

![PS64 Bit Test](/always-64bit-powershell-execution/PS64Bit-Test.png)

Again, we see the '64 bit ahoy` message, but this time, as expected, there was no warning.

Lastly, the astute reader will have noticed this little snippet of script `2>&1 | Tee-Object -Variable allOutput`. I'll avoid stream redirecting in the post, but the basics of what this does, is captured the steam output – all flavours – into the variable `allOutput`, which then is written to the host (tsk tsk, I know). Additionally, I've used [Tee-Object](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/tee-object?view=powershell-6), which, as the letter T implies, splits the stream into two, meaning the stream continues on in the pipeline.

Why, you ask? What would happen without it?

![PS32 Bit No Capture Test](/always-64bit-powershell-execution/PS32Bit-No-Capture-Test.png)

As you see, all the output is lost. Well, maybe not lost in a technical sense, but I will not see it from the 32-bit console, which is likely going to be annoying!

Source files can be downloaded from [Github](https://github.com/pleb/blogging-stash/tree/master/Powershell/Always64Bit).

Further reading:

- [Understanding Streams, Redirection, and Write-Host in PowerShell](https://devblogs.microsoft.com/scripting/understanding-streams-redirection-and-write-host-in-powershell/)
- [PowerShell Module Gallery](https://www.powershellgallery.com/)
- [How to Write a PowerShell Script Module](https://docs.microsoft.com/en-us/powershell/developer/module/how-to-write-a-powershell-script-module)
