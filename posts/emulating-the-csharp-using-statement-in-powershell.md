---
title: Emulating the C# Using Statement in PowerShell
slug: emulating-the-csharp-using-statement-in-powershell
date: July 1, 2019
categories:
- PowerShell
---

Most of my day is spent writing C#, and one of the very handy syntactic sugars I use and love is the [using](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-statement) statement. Sadly, PowerShell does not include it out of the box. The good news is; however, PowerShell does have [scriptblock](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_script_blocks?view=powershell-6), and if it's held right, we can emulate the C# `using` statement. ?

First, a little background for those who are not familiar with the C# `using` statement or those who do not know how it works under the hood. The .net [documentation](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/using-statement) states the using statement provides a convenient syntax that ensures the correct use of [IDiposable](https://docs.microsoft.com/en-us/dotnet/api/system.idisposable) objects. Clear as mud, right? Well, maybe not. In layman's terms, an object instance of a class implementing the `IDisposable` interface will be disposed of correctly by the convenient syntax.

Disposed of correctly? Let's just do a quick example.

For this example, we will create a fake database connection class, which will also implement the `IDisposable` interface. The constructor and Dispose methods will write a message to the console, whilst the `RunQuery` method will throw an exception.

"`c#
public class DbConnection : IDisposable
{
public DbConnection()
{
Console.WriteLine("New instance of Db Connection");
}

    public void RunQuery()
    {
        throw new Exception("Error.... soz");
    }

    public void Dispose()
    {
        Console.WriteLine("Db Connection disposed");
    }
}
```

In C#, if you were to correctly handle the `IDisposable` contract yourself, you would have to write code like the following:

"`c#
void Main()
{
    DbConnection db = new DbConnection();
    try
    {
        db.RunQuery();
    }
    finally
    {
        db.Dispose();
    }
}
```

Which, when run, will output this:

"`text
New instance of Db Connection
-> Exception
Db Connection disposed
```

As you can see, when we ran the example, three key things happened. First, a message was written to the console stating that a new instance of the Db Connection class was created. Second, an error was encountered when we "tried" to run a query. Lastly, and of most importance, a message was written to the console stating the instance was disposed of.

Cool, but that was all a bit verbose, right? Absolutely, and that is where the using syntax comes in and reduces all that to this:

"`c#
void Main()
{
    using(var db = new DbConnection()) 
    {
        db.RunQuery();
    }
}
```

Neat!

On a side note, this is all compiler magic, by the way. The compiler simply translates this convenient syntax and converts it to be like our first example where we handled calling the dispose method ourselves. You can see this yourself in the diagram below, which is the IL output of the compiler. I've added a few red arrows pointing to the similarities.

![Using statement IL Magic](/emulating-the-csharp-using-statement-in-powershell/Using-Statement-IL-Magic-1.png)

Refresher over!

How do we do the same in PowerShell? It turns out that it's pretty easy. To demonstrate this, I'll define the PowerShell module `Use-Object.psm1` and add code to memic the c# `using` statement.

```ps
Function Use-Object {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [AllowEmptyCollection()]
        [AllowNull()]
        [Object]
        $InputObject,
        [Parameter(Mandatory = $true)]
        [scriptblock]
        $ScriptBlock
    )
    Process {
        try {
            . $ScriptBlock
        }
        finally {
            if ($null -ne $InputObject -and $InputObject -is [System.IDisposable]) {
                $InputObject.Dispose()
            }
        }
    }
}
```

As you can see, this looks a lot like the C# examples above. The critical difference is the PowerShell module code for accepting a script block and an input object. However, the rest should look familiar.

A concise example of this module's use:

"`ps
Use-Object ($connection = New-Object -TypeName "System.Data.SqlClient.SqlConnection" -ArgumentList $ConnectionString) {
# Script using the $connection
$connection.Open()
}
```

Great! This looks very similar to the c# using statement.

Of particular interest with this example is the use of the `scriptblock`. As you can see, this `scriptblock` feature allows us to capture the PowerShell statements and execute them at a later time. In our case, we use these captured statements and execute them within a try/catch clause. This allows us to emulate the C# using statement, and I think the emulated statement's syntax is clean and intuitive.

Time to see this module's use in a more prominent example.

Below is a little script that will connect to SQL Server (localdb) and query for the string `Hello from SQL Server`. A reasonably basic script for sure, but the essential feature here is that the .net classes used in the example all implement the interface `IDisposable` and should, in theory, be disposed of.

```ps
Set-Location ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
[Environment]::CurrentDirectory = ([System.IO.Path]::GetFullPath((Split-Path $PSCOMMANDPATH)))
Import-Module ".\Modules\Use-Object.psm1" -Force

$ConnectionString = "Data Source=(localdb)\MSSQLLocalDB;Integrated Security=True"
$Query = "SELECT 'Hello from SQL Server' AS result"

Use-Object ($connection = New-Object -TypeName "System.Data.SqlClient.SqlConnection" -ArgumentList $ConnectionString) {
    $connection.Open()

    Use-Object ($command = $connection.CreateCommand()) {
        $command.CommandText = $Query

        Use-Object ($reader = $command.ExecuteReader()) {
            while($reader.Read()) {
                $row = @{}
                for($i = 0; $i -lt $reader.FieldCount; $i++){
                    $colName = $reader.GetName($i)
                    $colValue = $reader.GetValue($i)
                    $row.Set_Item($colName, $colValue)
                }
                # Add to the return
                $row
            }
        }
    }
}
```

And that's it. Not bad, eh?

Source files can be downloaded from [Github](https://github.com/pleb/blogging-stash/tree/master/Powershell/UsingStatement).
