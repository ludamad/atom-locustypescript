if (typeof $$cts$$runtime === "undefined") {
    if (typeof require !== "undefined") require("./cts-runtime.js");
    else if (typeof document !== "undefined") { document.writeln("<script src=\"cts-runtime.js\"></script>"); }
    else throw new Error("Could not load ConcreteTypeScript runtime!");
}var cts$$temp$$types_13$$0;
var cts$$temp$$types_7009$$1;
var $$cts$$brand$$Bar = new $$cts$$runtime.Brand("Bar", function(){
    return [$$cts$$brand$$Bar.prototype, ];
});
$$cts$$brand$$Bar.prototype = new $$cts$$runtime.Brand("Bar.prototype", function() {
    return [];
});
var $$cts$$brand$$Foo = new $$cts$$runtime.Brand("Foo", function(){
    return [$$cts$$brand$$Foo.prototype, ];
});
$$cts$$brand$$Foo.prototype = new $$cts$$runtime.Brand("Foo.prototype", function() {
    return [];
});
function makeFoo() {var cts$$temp$$Foo_7008_x$$0;
var cts$$temp$$Foo_7008_$$BRAND$$GUARD$$1;
var cts$$temp$$Foo_7008_y$$2;
    var foo = {};
    $$cts$$runtime.protectAssignment(cts$$temp$$Foo_7008_x$$0++, Number, 'x', foo, 1);
    $$cts$$runtime.protectAssignment(cts$$temp$$Foo_7008_y$$2++, Number, 'y', foo, 2);$$cts$$runtime.brand($$cts$$brand$$Foo, foo);
}
$$cts$$runtime.cementGlobal("makeFoo",makeFoo);
var foo = ($$cts$$runtime.cast($$cts$$brand$$Foo,({ x: 1, y: 1 })));
