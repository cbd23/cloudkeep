async function indexGet(req, res) {
    res.render("index", { user: req.user })
}

export const indexController = {
    indexGet,
}