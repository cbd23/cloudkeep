async function signUpGet(req, res) {
    res.render("signUp", {})
}

export const signUpController = {
    signUpGet,
}