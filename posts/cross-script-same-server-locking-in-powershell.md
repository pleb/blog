---
title: Cross-script same server locking in PowerShell
slug: cross-script-same-server-locking-in-powershell
date: July 6, 2019
categories:
- PowerShell
---

## Background

A little background. Feel free to skip this if you like.

A year or two ago, I wrote deployment scripts for a few different web applications. These web apps were all deployed by [AWS CodeDeploy](https://aws.amazon.com/codedeploy/), and various instances of these apps were being deployed to the same server.

It just so happens that AWS CodeDeploy will deploy to the same server in parallel. Therefore, If you have it configured to deploy to the same server, the deployments may happen simultaneously. And, it's this simultaneous deployment that can cause problems!

Under normal DevOps operations, deployments will infrequently happen at the same time. The common phrase "that's weird, hit deploy again" is the typical way of dealing with infrequent deploy errors. And at the time, this was the solution the team I was on used.

However, this is **not** ok in the long run. It is imperative to have a high level of trust in your deployment processes. If you are deploying often, this is not just a nice to have; this is a must-have. Even if your deployments are infrequent, one should never feel anxious about a deployment in progress because your deployments scripts/processes are flaky. Worry about the things that should matter!

I took on some of this advice and narrowed in on the issue through investigation. It turns out that the `WebAdministration` module, essentially a module for configuring IIS on Windows, was erroring when issued with simultaneous requests. Although I never could prove it, an educated guess of mine was that this was being caused by the fact that modern IIS reads and writes most of its configuration to the `ConfigApplicationHost.config`. A file located under the `%WinDir%\System32\Inetsrv\directory`. And, I believe the issue was due to some sort of file write/read contention lock.

The good news for me was that I hadn't littered our deployment scripts with hundreds of lines of procedural code. I used PowerShell modules and created a somewhat bespoke reusable deployment library that had all the common functionality I needed. An example of this common functionality was the `Remove-Website` function, which given a path, would remove all IIS related features, such as Websites, Applications and AppPools.

## Signalling

All I needed to solve this issue was a signalling system so that simultaneous deployments could coordinate the sharing of this resource.

Hmm, but we're in the land of scripting, so this is this impossible task, right? Actually, no! Because PowerShell is built on top of .net, we can tap into a lot of PowerFull (I couldn't help myself) functionality that .net provides. All I needed was the .net Mutex to enable system wide signalling.

Let's take a look at how I used it.

At the top of each deployment script, I declared two scripts scoped variables, a timeout and the instance of the Mutex.

Declaring the Mutex:

```ps
$global:defaultMutexWait = New-TimeSpan -Minutes 1
$global:mutex = New-Object System.Threading.Mutex($false, "ABCCodeDeploy")
```

Next, I moved all the deployment script code into a Try/Catch/Finally block. The reason for this was I needed to make sure I cleaned up the Mutex regardless of whether the script was executed correctly or not.

The script body ended up looking a little like this:

```ps
$global:defaultMutexWait = New-TimeSpan -Minutes 1
$gloabl:mutex = New-Object System.Threading.Mutex($false, "ABCCodeDeploy")
$ErrorActionPreference = "Stop"

try {
    #
    # Script code
    #
} catch {
    if ($_ -ne "") { $script:errvar = $_ }
    # This causes the session to exit and return an exit code value of 1. This also causes CodeDeploy to fail the deployment.
    exit 1
} finally {
    if ($script:errvar -eq $null) {
        # Log script executed correctly
    } else {
        # Log error
        # Push logs to S3 for easy viewing
        # Send slack failure notification
    }
    if (-not $global:mutex -eq $null) {
        $global:mutex.Dispose()
    }
}
```

As you can see, the Mutex is correctly disposed of.

Great! But how exactly was it used?

Well, it turns out PowerShell functions are a little weird. When you think of a function in a traditional language, you probably think of name, parameters and body, right? Well, PowerShell has a name, parameters, begin, process and end. So, for example, we could declare a function like so:

```ps
function Example {
  begin { 
    Write-Output "Function begin"
  }
  process {
    Write-Output "Function code"
  }
  end {
    Write-Output "Function end"
  }
}

Example
```

Which, when run, outputs:


"`text
Function begin
Function code
Function end
```

Bring it all together.

If you didn't skip the first part of this post, you would have read about my `Remove-Website` function. Well, to tie the Mutex into this function was pretty easy. I changed this function and any others using the IIS module to make use of begin, process and end. I added locking utilising the Mutex. In the end, they all ended up following this format:

```ps
Function Remove-WebSites {
    [CmdletBinding()]
    [OutputType([Void])]
    Param(
        [parameter(Mandatory = $True)]
        [String]
        $Path
    )
    Begin {
        $global:mutex.WaitOne($defaultMutexWait) | Out-Null
    }
    End {
        $global:mutex.ReleaseMutex()
    }
    Process {
        # Script logic
    }
}
```

As you can see, before the function would execute, a lock was acquired, and when finished, the lock was released.

Fairly neat, eh? Well, I thought so.

Source files can be downloaded from [Github](https://github.com/pleb/blogging-stash/tree/master/Powershell/Mutex).

## Update

Special thanks to [biz](https://www.reddit.com/user/bis/) for pointing out that because the Mutex is named, a globally scoped variable isn't needed as one can declare and lock within a function. An example of this is like so:

```ps
function ExampleFunctionWithLocking {
    begin { 
        $defaultMutexWait = New-TimeSpan -Minutes 1
        $mutex = New-Object System.Threading.Mutex($false, "ABCCodeDeploy")
        $mutex.WaitOne($defaultMutexWait) | Out-Null
    }
    process {
        Write-Output "Function with locking was executed."
    }
    end {
        $mutex.Dispose()
    }
}
```
