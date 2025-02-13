async function signInGet(req, res) {
    res.render("signIn", {})
}

export const signInController = {
    signInGet,
}