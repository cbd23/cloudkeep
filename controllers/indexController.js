async function indexGet(req, res) {
    res.render("index", {})
}

export const indexController = {
    indexGet,
}