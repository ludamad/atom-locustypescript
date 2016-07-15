brand interface Bar {
}

brand interface Foo extends Bar {
    x: !number;
    y: !number;
}

function makeFoo() {
    var foo: declare Foo = {};
    foo.x = 1;
    foo.y = 2;
}
var foo: !Foo = {x:1, y:1};
