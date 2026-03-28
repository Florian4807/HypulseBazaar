using SkyBazaar.Services;
using Xunit;

namespace SkyBazaar.Tests;

public class StringExtensionsTests
{
    [Fact]
    public void ToTitleCase_ConvertsWordsToTitleCase()
    {
        var result = "enchanted slime ball".ToTitleCase();
        Assert.Equal("Enchanted Slime Ball", result);
    }

    [Fact]
    public void ToTitleCase_HandlesEmptyString()
    {
        var result = string.Empty.ToTitleCase();
        Assert.Equal(string.Empty, result);
    }
}

