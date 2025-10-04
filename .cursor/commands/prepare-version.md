<main-objective>
- This command is to prepare to generate a new version of cucumber java runner extensions.
- The user should send a new version or the version change was be the minor
- Make sure your are getting lastest version tags from repo, its generated auto in workflows and can not be pull in local repository
- The changelog and readme must be update, you can use tags in git to get difference and make a summary of the changes, the tags are made with v+${versionInPackage.json}.
- Keep readme update to show new functionalities
- Don't generate a tag, workflows is responsible to do it
- You can verify project is alright but not need make a vsix file, workflows are made to do it
</main-objective>

<example>
    <case-1>
        /prepare-version 1.2.0

        actual package.json version is 1.0.0

        Must be change version of @package.json to 1.2.0
    </case-1>
    </case-2>
        /prepare-version

        actual package.json version is 1.0.0

        Must be change version of @package.json to 1.0.1
    </case-2>
</example>