async function signInGet(req, res) {
    res.render("signIn", { user: req.user })
}

export const signInController = {
    signInGet,
}