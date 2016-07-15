if (typeof $$cts$$runtime === "undefined") {
    if (typeof require !== "undefined") require("./cts-runtime.js");
    else if (typeof document !== "undefined") { document.writeln("<script src=\"cts-runtime.js\"></script>"); }
    else throw new Error("Could not load ConcreteTypeScript runtime!");
}var cts$$temp$$types_13$$0;
var $$cts$$brand$$Soup = new $$cts$$runtime.Brand("Soup", function(){
    return [$$cts$$brand$$Soup.prototype, ];
});
$$cts$$brand$$Soup.prototype = new $$cts$$runtime.Brand("Soup.prototype", function() {
    return [];
});
function foo(s) {var cts$$temp$$Soup_7008_x$$0;
var cts$$temp$$Soup_7008_$$BRAND$$GUARD$$1;
var cts$$temp$$Soup_7008_y$$2;
    $$cts$$runtime.protectAssignment(cts$$temp$$Soup_7008_x$$0++, Number, 'x', s, 1);
    $$cts$$runtime.brandAndForward(cts$$temp$$Soup_7008_$$BRAND$$GUARD$$1++, $$cts$$brand$$Soup, s, $$cts$$runtime.protectAssignment(cts$$temp$$Soup_7008_y$$2++, Number, 'y', s, 2));$$cts$$runtime.brand($$cts$$brand$$Soup, s);
}
$$cts$$runtime.cementGlobal("foo",foo);
